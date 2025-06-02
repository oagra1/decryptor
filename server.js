require('dotenv').config();

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

// Configurações do .env
const PORT = process.env.PORT || 3000;
const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true';
const ENABLE_CORS = process.env.ENABLE_CORS === 'true';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024;

if (ENABLE_CORS) {
  // Configura CORS com origem definida no .env ou permite todas
  const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'];
  app.use(cors({
    origin: function(origin, callback) {
      if (!origin || allowedOrigins.indexOf('*') !== -1 || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  }));
}

// Middleware para JSON
app.use(express.json({ limit: MAX_FILE_SIZE }));

// Configuração Multer para upload em memória com limite de tamanho
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }
});

// Leitura segura da chave privada RSA
const privateKeyPath = process.env.PRIVATE_KEY_PATH;
if (!privateKeyPath) {
  console.error('ERRO: Variável PRIVATE_KEY_PATH não definida no .env');
  process.exit(1);
}

let PRIVATE_KEY_PEM;
try {
  PRIVATE_KEY_PEM = fs.readFileSync(privateKeyPath, 'utf-8');
  if (DEBUG_LOGS) console.log('Chave privada RSA carregada com sucesso.');
} catch (err) {
  console.error('ERRO ao ler a chave privada RSA:', err.message);
  process.exit(1);
}

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
app.post('/whatsapp-flow-endpoint', upload.none(), async (req, res) => {
  try {
    const { encrypted_flow_data, encrypted_aes_key, initial_vector } = req.body;

    if (!encrypted_flow_data || !encrypted_aes_key || !initial_vector) {
      if (DEBUG_LOGS) console.warn('Requisição com parâmetros faltando:', req.body);
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // 1. Decrypt AES key
    const aesKey = decryptAESKey(encrypted_aes_key);

    // 2. Decrypt payload
    const decryptedData = decryptPayload(encrypted_flow_data, aesKey, initial_vector);

    if (DEBUG_LOGS) console.log('Payload descriptografado:', decryptedData);

    // 3. Sua lógica de negócio aqui
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
    if (
      error.message.includes('bad decrypt') ||
      error.message.includes('Unsupported state or unable to authenticate data')
    ) {
      return res.status(421).send('Decryption failed');
    }

    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Inicializa servidor
app.listen(PORT, () => {
  console.log(`WhatsApp Flow Endpoint rodando na porta ${PORT}`);
});

// --- Leitura segura da chave privada RSA ---
const privateKeyPath = process.env.PRIVATE_KEY_PATH || './private.pem';
const PASSPHRASE = process.env.PASSPHRASE || null;

let PRIVATE_KEY_PEM;
try {
  PRIVATE_KEY_PEM = fs.readFileSync(privateKeyPath, 'utf-8');
  if (DEBUG_LOGS) console.log(`Chave privada RSA carregada de: ${privateKeyPath}`);
} catch (err) {
  console.error(`ERRO ao ler a chave privada RSA no caminho ${privateKeyPath}:`, err.message);
  process.exit(1);
}

// --- Funções de descriptografia e criptografia (mantém as que já te enviei) ---

// decryptAESKey, decryptPayload, encryptResponse ...

// --- Endpoint principal ---
app.post('/whatsapp-flow-endpoint', upload.none(), async (req, res) => {
  try {
    const { encrypted_flow_data, encrypted_aes_key, initial_vector } = req.body;

    if (!encrypted_flow_data || !encrypted_aes_key || !initial_vector) {
      if (DEBUG_LOGS) console.warn('Requisição com parâmetros faltando:', req.body);
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // 1. Decrypt AES key
    const aesKey = decryptAESKey(encrypted_aes_key);

    // 2. Decrypt payload
    const decryptedData = decryptPayload(encrypted_flow_data, aesKey, initial_vector);

    if (DEBUG_LOGS) console.log('Payload descriptografado:', decryptedData);

    // 3. Sua lógica de negócio aqui
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
    if (
      error.message.includes('bad decrypt') ||
      error.message.includes('Unsupported state or unable to authenticate data')
    ) {
      return res.status(421).send('Decryption failed');
    }

    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Inicializa servidor ---
app.listen(PORT, () => {
  console.log(`WhatsApp Flow Endpoint rodando na porta ${PORT}`);
});
