const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json());

// Carregue sua chave privada RSA PEM e passphrase da env
const PRIVATE_KEY_PEM = fs.readFileSync(process.env.PRIVATE_KEY_PATH, 'utf-8');
const PASSPHRASE = process.env.PASSPHRASE || null;

// Função para descriptografar a chave AES com RSA OAEP SHA256
function decryptAESKey(encryptedAesKeyB64) {
  const encryptedAesKey = Buffer.from(encryptedAesKeyB64, 'base64');
  const privateKey = crypto.createPrivateKey({
    key: PRIVATE_KEY_PEM,
    format: 'pem',
    passphrase: PASSPHRASE,
  });
  return privateKey.decrypt(encryptedAesKey, crypto.constants.RSA_PKCS1_OAEP_PADDING);
}

// Função para descriptografar payload AES-GCM
function decryptPayload(encryptedFlowDataB64, aesKey, ivB64) {
  const encryptedFlowData = Buffer.from(encryptedFlowDataB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');

  // Últimos 16 bytes são tag de autenticação
  const authTag = encryptedFlowData.slice(encryptedFlowData.length - 16);
  const encrypted = encryptedFlowData.slice(0, encryptedFlowData.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf-8'));
}

// Função para criptografar resposta AES-GCM com IV invertido
function encryptResponse(responseObj, aesKey, iv) {
  // Inverte o IV (XOR 0xFF)
  const flippedIv = Buffer.from(iv.map(b => b ^ 0xFF));

  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, flippedIv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(responseObj), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Concatena dados criptografados + tag
  const encryptedWithTag = Buffer.concat([encrypted, tag]);
  return encryptedWithTag.toString('base64');
}

// Endpoint principal
app.post('/whatsapp-flow-endpoint', async (req, res) => {
  try {
    const { encrypted_flow_data, encrypted_aes_key, initial_vector } = req.body;

    if (!encrypted_flow_data || !encrypted_aes_key || !initial_vector) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // 1. Decrypt AES key
    const aesKey = decryptAESKey(encrypted_aes_key);

    // 2. Decrypt payload
    const decryptedData = decryptPayload(encrypted_flow_data, aesKey, initial_vector);

    console.log('Decrypted payload:', decryptedData);

    // 3. Sua lógica de negócio aqui
    // Exemplo: responde com tela e dados
    const responsePayload = {
      screen: 'SCREEN_NAME',
      data: {
        message: 'Resposta segura do seu backend',
        receivedData: decryptedData,
      },
    };

    // 4. Encripta resposta
    const encryptedResponse = encryptResponse(responsePayload, aesKey, Buffer.from(initial_vector, 'base64'));

    // 5. Envia resposta para WhatsApp
    res.send(encryptedResponse);

  } catch (error) {
    console.error('Erro no endpoint WhatsApp Flow:', error);

    // Se erro de descriptografia, responde HTTP 421 para WhatsApp tentar novamente
    if (error.message.includes('bad decrypt') || error.message.includes('Unsupported state or unable to authenticate data')) {
      return res.status(421).send('Decryption failed');
    }

    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Inicializa servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WhatsApp Flow Endpoint rodando na porta ${PORT}`);
});
