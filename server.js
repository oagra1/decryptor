const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Log de inicialização
console.log('🔧 Iniciando WhatsApp Decrypter...');

// WhatsApp Decrypter Class
class WhatsAppDecrypter {
  static async downloadMedia(url) {
    try {
      console.log('📥 Baixando mídia de:', url.substring(0, 50) + '...');
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'WhatsApp/2.0'
        }
      });
      console.log('✅ Download concluído, tamanho:', response.data.byteLength, 'bytes');
      return Buffer.from(response.data);
    } catch (error) {
      console.error('❌ Erro no download:', error.message);
      throw new Error(`Erro ao baixar mídia: ${error.message}`);
    }
  }

  static decryptMedia(encryptedData, mediaKey, fileEncSha256) {
    try {
      console.log('🔐 Iniciando descriptografia...');
      
      // Decodificar a mediaKey de base64
      const key = Buffer.from(mediaKey, 'base64');
      console.log('🔑 Chave decodificada, tamanho:', key.length);
      
      if (key.length < 80) {
        throw new Error('MediaKey muito pequena');
      }
      
      // Expandir a chave
      const iv = key.slice(0, 16);
      const cipherKey = key.slice(16, 48);
      const macKey = key.slice(48, 80);
      
      console.log('📊 Dados criptografados:', encryptedData.length, 'bytes');
      
      // Separar os dados criptografados do MAC
      const encryptedFile = encryptedData.slice(0, -10);
      const mac = encryptedData.slice(-10);
      
      // Verificar integridade MAC
      const hmac = crypto.createHmac('sha256', macKey);
      hmac.update(iv);
      hmac.update(encryptedFile);
      const computedMac = hmac.digest().slice(0, 10);
      
      if (!crypto.timingSafeEqual(mac, computedMac)) {
        throw new Error('Verificação MAC falhou - arquivo pode estar corrompido');
      }
      console.log('✅ Verificação MAC passou');
      
      // Descriptografar usando AES-256-CBC
      const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
      const decrypted = Buffer.concat([
        decipher.update(encryptedFile),
        decipher.final()
      ]);
      
      console.log('🔓 Arquivo descriptografado, tamanho:', decrypted.length, 'bytes');
      
      // Verificar SHA256 do arquivo descriptografado
      const fileSha256 = crypto.createHash('sha256').update(decrypted).digest();
      const expectedSha256 = Buffer.from(fileEncSha256, 'base64');
      
      if (!crypto.timingSafeEqual(fileSha256, expectedSha256)) {
        throw new Error('Verificação SHA256 falhou - arquivo descriptografado incorreto');
      }
      console.log('✅ Verificação SHA256 passou');
      
      return decrypted;
    } catch (error) {
      console.error('❌ Erro na descriptografia:', error.message);
      throw new Error(`Erro na descriptografia: ${error.message}`);
    }
  }

  static async processMedia(data) {
    const { url, mediaKey, fileEncSha256, mimetype, fileName } = data;
    
    // Validar dados de entrada
    if (!url || !mediaKey || !fileEncSha256) {
      throw new Error('Dados obrigatórios faltando: url, mediaKey, fileEncSha256');
    }
    
    console.log('🎯 Processando mídia:', fileName || 'arquivo_sem_nome');
    
    // Baixar mídia criptografada
    const encryptedData = await this.downloadMedia(url);
    
    // Descriptografar mídia
    const decryptedData = this.decryptMedia(encryptedData, mediaKey, fileEncSha256);
    
    console.log('🎉 Processamento concluído com sucesso!');
    
    return {
      data: decryptedData,
      mimetype: mimetype || 'application/octet-stream',
      fileName: fileName || 'decrypted_file'
    };
  }
}

// Middleware de log de requisições
app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rotas da API
app.post('/decrypt', async (req, res) => {
  try {
    console.log('🚀 Nova requisição de descriptografia recebida');
    console.log('📋 Dados recebidos:', {
      url: req.body.url ? '✅ presente' : '❌ faltando',
      mediaKey: req.body.mediaKey ? '✅ presente' : '❌ faltando',
      fileEncSha256: req.body.fileEncSha256 ? '✅ presente' : '❌ faltando',
      mimetype: req.body.mimetype || 'não informado',
      fileName: req.body.fileName || 'não informado'
    });

    const result = await WhatsAppDecrypter.processMedia(req.body);
    
    // Configurar headers de resposta
    res.set({
      'Content-Type': result.mimetype,
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
      'Content-Length': result.data.length,
      'X-Decryption-Status': 'success',
      'Access-Control-Expose-Headers': 'Content-Disposition, Content-Type, Content-Length'
    });
    
    console.log('📤 Enviando arquivo descriptografado:', result.fileName);
    console.log('📊 Tamanho final:', result.data.length, 'bytes');
    
    // Enviar arquivo descriptografado
    res.send(result.data);
    
  } catch (error) {
    console.error('💥 Erro na requisição:', error.message);
    res.status(400).json({
      error: 'Erro na descriptografia',
      message: error.message,
      timestamp: new Date().toISOString(),
      success: false
    });
  }
});

// Rota de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'WhatsApp Decrypter',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rota de status
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    service: 'WhatsApp Decrypter',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// Rota principal - documentação
app.get('/', (req, res) => {
  res.json({
    message: '🔓 WhatsApp Decrypter API',
    status: 'running',
    endpoints: {
      decrypt: 'POST /decrypt - Descriptografar arquivo',
      health: 'GET /health - Health check',
      status: 'GET /status - Status detalhado'
    },
    usage: {
      method: 'POST',
      url: '/decrypt',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        url: 'https://mmg.whatsapp.net/...',
        mediaKey: 'base64_encoded_key',
        fileEncSha256: 'base64_encoded_hash',
        mimetype: 'application/pdf',
        fileName: 'arquivo.pdf'
      }
    },
    example: 'curl -X POST http://' + req.get('host') + '/decrypt -H "Content-Type: application/json" -d \'{"url":"...","mediaKey":"...","fileEncSha256":"..."}\''
  });
});

// Middleware de tratamento de rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    message: `A rota ${req.method} ${req.originalUrl} não existe`,
    availableEndpoints: ['GET /', 'GET /health', 'GET /status', 'POST /decrypt']
  });
});

// Middleware de erro global
app.use((error, req, res, next) => {
  console.error('💥 Erro não tratado:', error);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Tratamento de sinais de encerramento
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, encerrando servidor...');
  process.exit(0);
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 ========================================');
  console.log('🚀 WhatsApp Decrypter iniciado com sucesso!');
  console.log('🚀 ========================================');
  console.log(`📡 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 API disponível em http://0.0.0.0:${PORT}`);
  console.log(`🔓 Endpoint principal: POST /decrypt`);
  console.log(`❤️  Health check: GET /health`);
  console.log(`📊 Status: GET /status`);
  console.log('🚀 ========================================');
});
