const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// Configurar bodyParser para receber JSON e payloads grandes
app.use(bodyParser.json({ limit: '50mb' }));

/**
 * POST /decrypt/n8n
 * Recebe JSON com:
 * {
 *   "encryptedData": "base64string",
 *   "key": "hexstring",
 *   "algorithm": "aes-256-cbc",
 *   "iv": "hexstring" // obrigatório para modos CBC
 * }
 * Retorna JSON:
 * {
 *   "decryptedData": "base64string"
 * }
 */
app.post('/decrypt/n8n', (req, res) => {
  try {
    const { encryptedData, key, algorithm, iv } = req.body;

    if (!encryptedData || !key || !algorithm) {
      return res.status(400).json({ error: 'encryptedData, key e algorithm são obrigatórios' });
    }

    // Converter inputs para buffers
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    const keyBuffer = Buffer.from(key, 'hex');

    let ivBuffer = null;
    if (iv) {
      ivBuffer = Buffer.from(iv, 'hex');
    }

    // Criar decipher conforme algoritmo e parâmetros
    let decipher;
    if (ivBuffer) {
      decipher = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
    } else {
      decipher = crypto.createDecipher(algorithm, keyBuffer);
    }

    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    // Retornar arquivo descriptografado em base64
    res.json({
      decryptedData: decrypted.toString('base64')
    });
  } catch (error) {
    console.error('Erro ao descriptografar:', error);
    res.status(500).json({ error: 'Falha na descriptografia', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`API de descriptografia rodando na porta ${port}`);
});
