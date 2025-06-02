const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// WhatsApp Decrypter Class
class WhatsAppDecrypter {
  static async downloadMedia(url) {
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        timeout: 30000
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Erro ao baixar mídia: ${error.message}`);
    }
  }

  static decryptMedia(encryptedData, mediaKey, fileEncSha256) {
    try {
      // Decodificar a mediaKey de base64
      const key = Buffer.from(mediaKey, 'base64');
      
      // Expandir a chave usando HKDF
      const iv = key.slice(0, 16);
      const cipherKey = key.slice(16, 48);
      const macKey = key.slice(48, 80);
      
      // Separar os dados criptografados do MAC
      const encryptedFile = encryptedData.slice(0, -10);
      const mac = encryptedData.slice(-10);
      
      // Verificar integridade MAC
      const hmac = crypto.createHmac('sha256', macKey);
      hmac.update(iv);
      hmac.update(encryptedFile);
      const computedMac = hmac.digest().slice(0, 10);
      
      if (!crypto.timingSafeEqual(mac, computedMac)) {
        throw new Error('MAC verification failed');
      }
      
      // Descriptografar usando AES-256-CBC
      const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
      const decrypted = Buffer.concat([
        decipher.update(encryptedFile),
        decipher.final()
      ]);
      
      // Verificar SHA256 do arquivo descriptografado
      const fileSha256 = crypto.createHash('sha256').update(decrypted).digest();
      const expectedSha256 = Buffer.from(fileEncSha256, 'base64');
      
      if (!crypto.timingSafeEqual(fileSha256, expectedSha256)) {
        throw new Error('SHA256 verification failed');
      }
      
      return decrypted;
    } catch (error) {
      throw new Error(`Erro na descriptografia: ${error.message}`);
    }
  }

  static async processMedia(data) {
    const { url, mediaKey, fileEncSha256, mimetype, fileName } = data;
    
    // Validar dados de entrada
    if (!url || !mediaKey || !fileEncSha256) {
      throw new Error('Dados obrigatórios faltando: url, mediaKey, fileEncSha256');
    }
    
    // Baixar mídia criptografada
    const encryptedData = await this.downloadMedia(url);
    
    // Descriptografar mídia
    const decryptedData = this.decryptMedia(encryptedData, mediaKey, fileEncSha256);
    
    return {
      data: decryptedData,
      mimetype: mimetype || 'application/octet-stream',
      fileName: fileName || 'decrypted_file'
    };
  }
}

// Rotas da API
app.post('/decrypt', async (req, res) => {
  try {
    console.log('Recebida requisição de descriptografia:', {
      url: req.body.url ? 'presente' : 'faltando',
      mediaKey: req.body.mediaKey ? 'presente' : 'faltando',
      fileEncSha256: req.body.fileEncSha256 ? 'presente' : 'faltando',
      mimetype: req.body.mimetype,
      fileName: req.body.fileName
    });

    const result = await WhatsAppDecrypter.processMedia(req.body);
    
    // Configurar headers de resposta
    res.set({
      'Content-Type': result.mimetype,
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
      'Content-Length': result.data.length,
      'X-Decryption-Status': 'success'
    });
    
    // Enviar arquivo descriptografado
    res.send(result.data);
    
  } catch (error) {
    console.error('Erro na descriptografia:', error.message);
    res.status(400).json({
      error: 'Erro na descriptografia',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Rota de status
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    service: 'WhatsApp Decrypter',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Rota de teste
app.get('/', (req, res) => {
  res.json({
    message: 'WhatsApp Decrypter API',
    endpoints: {
      decrypt: 'POST /decrypt',
      status: 'GET /status'
    },
    usage: {
      method: 'POST',
      url: '/decrypt',
      body: {
        url: 'https://mmg.whatsapp.net/...',
        mediaKey: 'base64_encoded_key',
        fileEncSha256: 'base64_encoded_hash',
        mimetype: 'application/pdf',
        fileName: 'arquivo.pdf'
      }
    }
  });
});

// Middleware de erro global
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 API disponível em http://localhost:${PORT}`);
  console.log(`🔓 Endpoint de descriptografia: POST http://localhost:${PORT}/decrypt`);
});
