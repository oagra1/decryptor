const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const WhatsAppDecrypter = require('./decrypt');

const app = express();
const port = process.env.PORT || 3000;

// Configuração do multer para upload de arquivos
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB max
    }
});

// Middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Instância do decrypter
const decrypter = new WhatsAppDecrypter();

// Rota principal
app.get('/', (req, res) => {
    res.json({
        message: 'WhatsApp Media Decrypter API',
        version: '1.0.0',
        endpoints: {
            'POST /decrypt': 'Descriptografa um arquivo do WhatsApp',
            'POST /decrypt/buffer': 'Descriptografa dados em buffer',
            'GET /health': 'Verifica o status da API'
        }
    });
});

// Rota de saúde
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rota para descriptografar arquivo via upload
app.post('/decrypt', upload.single('file'), async (req, res) => {
    try {
        console.log('📥 Recebendo requisição /decrypt');
        console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
        console.log('📦 Body:', JSON.stringify(req.body, null, 2));
        console.log('📁 File info:', req.file ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        } : 'Nenhum arquivo');
        
        const { mediaKey, mediaType = 'document', outputName } = req.body;
        
        if (!req.file) {
            return res.status(400).json({
                error: 'Nenhum arquivo foi enviado',
                debug: {
                    hasFile: !!req.file,
                    body: req.body,
                    files: req.files
                }
            });
        }
        
        if (!mediaKey) {
            return res.status(400).json({
                error: 'mediaKey é obrigatória',
                debug: {
                    mediaKey: {
                        presente: !!mediaKey,
                        tipo: typeof mediaKey,
                        valor: mediaKey
                    },
                    bodyCompleto: req.body
                }
            });
        }

        console.log(`📥 Arquivo recebido: ${req.file.originalname} (${req.file.size} bytes)`);
        console.log(`🔑 MediaKey: ${mediaKey.substring(0, 20)}...`);
        console.log(`📄 Tipo de mídia: ${mediaType}`);

        // Ativar debug no decrypter
        decrypter.setDebug(true);
        
        // Debug do buffer recebido
        console.log('🔍 Debug do arquivo:');
        console.log(`   Tamanho: ${req.file.buffer.length} bytes`);
        console.log(`   Primeiros 32 bytes: ${req.file.buffer.slice(0, 32).toString('hex')}`);
        console.log(`   Últimos 32 bytes: ${req.file.buffer.slice(-32).toString('hex')}`);

        // Descriptografa o arquivo
        const decryptedBuffer = decrypter.decryptBuffer(req.file.buffer, mediaKey, mediaType);
        
        // Detecta o tipo do arquivo
        const detectedType = decrypter.detectFileType(decryptedBuffer);
        
        // Define o nome do arquivo de saída
        const fileName = outputName || `decrypted_${Date.now()}.${detectedType}`;
        
        console.log(`✅ Arquivo descriptografado com sucesso`);
        console.log(`📁 Tipo detectado: ${detectedType}`);
        console.log(`💾 Tamanho final: ${decryptedBuffer.length} bytes`);

        // Retorna o arquivo descriptografado
        res.set({
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': decryptedBuffer.length
        });
        
        res.send(decryptedBuffer);

    } catch (error) {
        console.error('❌ Erro na descriptografia:', error.message);
        res.status(500).json({
            error: 'Erro na descriptografia',
            details: error.message
        });
    }
});

// Rota para descriptografar dados em base64
app.post('/decrypt/buffer', async (req, res) => {
    try {
        console.log('📥 Recebendo requisição /decrypt/buffer');
        console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
        console.log('📦 Body keys:', Object.keys(req.body));
        console.log('📦 Body:', JSON.stringify(req.body, null, 2));
        
        const { encryptedData, mediaKey, mediaType = 'document', returnBase64 = false } = req.body;
        
        // Debug mais detalhado
        console.log('🔍 Validação dos dados:');
        console.log(`   encryptedData presente: ${!!encryptedData}`);
        console.log(`   encryptedData tipo: ${typeof encryptedData}`);
        console.log(`   encryptedData tamanho: ${encryptedData ? encryptedData.length : 'N/A'}`);
        console.log(`   mediaKey presente: ${!!mediaKey}`);
        console.log(`   mediaKey tipo: ${typeof mediaKey}`);
        console.log(`   mediaKey tamanho: ${mediaKey ? mediaKey.length : 'N/A'}`);
        
        if (!encryptedData || !mediaKey) {
            const errorDetail = {
                encryptedData: {
                    presente: !!encryptedData,
                    tipo: typeof encryptedData,
                    tamanho: encryptedData ? encryptedData.length : null
                },
                mediaKey: {
                    presente: !!mediaKey,
                    tipo: typeof mediaKey,
                    tamanho: mediaKey ? mediaKey.length : null
                },
                bodyCompleto: req.body
            };
            
            return res.status(400).json({
                error: 'encryptedData e mediaKey são obrigatórios',
                debug: errorDetail
            });
        }

        console.log(`📥 Descriptografando buffer (${encryptedData.length} chars base64)`);
        console.log(`🔑 MediaKey: ${mediaKey.substring(0, 20)}...`);

        // Converte de base64 para buffer
        const encryptedBuffer = Buffer.from(encryptedData, 'base64');
        
        // Descriptografa
        const decryptedBuffer = decrypter.decryptBuffer(encryptedBuffer, mediaKey, mediaType);
        
        // Detecta o tipo do arquivo
        const detectedType = decrypter.detectFileType(decryptedBuffer);
        
        console.log(`✅ Buffer descriptografado com sucesso`);
        console.log(`📁 Tipo detectado: ${detectedType}`);
        console.log(`💾 Tamanho final: ${decryptedBuffer.length} bytes`);

        const response = {
            success: true,
            detectedFileType: detectedType,
            size: decryptedBuffer.length,
            data: returnBase64 ? decryptedBuffer.toString('base64') : decryptedBuffer
        };

        if (returnBase64) {
            res.json(response);
        } else {
            // Retorna o arquivo binário
            res.set({
                'Content-Type': 'application/octet-stream',
                'X-Detected-Type': detectedType,
                'X-File-Size': decryptedBuffer.length
            });
            res.send(decryptedBuffer);
        }

    } catch (error) {
        console.error('❌ Erro na descriptografia:', error.message);
        res.status(500).json({
            error: 'Erro na descriptografia',
            details: error.message
        });
    }
});

// Rota para testar a descriptografia com arquivo local
app.post('/decrypt/file', async (req, res) => {
    try {
        const { inputPath, mediaKey, mediaType = 'document', outputPath } = req.body;
        
        if (!inputPath || !mediaKey) {
            return res.status(400).json({
                error: 'inputPath e mediaKey são obrigatórios'
            });
        }

        if (!fs.existsSync(inputPath)) {
            return res.status(404).json({
                error: 'Arquivo não encontrado',
                path: inputPath
            });
        }

        const finalOutputPath = outputPath || `decrypted_${Date.now()}.bin`;
        
        console.log(`📥 Descriptografando arquivo: ${inputPath}`);
        console.log(`🔑 MediaKey: ${mediaKey.substring(0, 20)}...`);
        console.log(`💾 Saída: ${finalOutputPath}`);

        const result = await decrypter.decryptFile(inputPath, mediaKey, finalOutputPath, mediaType);
        
        res.json({
            success: true,
            inputPath: inputPath,
            outputPath: result,
            message: 'Arquivo descriptografado com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro na descriptografia:', error.message);
        res.status(500).json({
            error: 'Erro na descriptografia',
            details: error.message
        });
    }
});

// Rota específica para N8N - Processa webhook do WhatsApp
app.post('/n8n/decrypt', async (req, res) => {
    try {
        console.log('🎯 Recebendo dados do N8N');
        console.log('📦 Dados recebidos:', JSON.stringify(req.body, null, 2));
        
        const N8NProcessor = require('./n8n_decrypt').N8NWhatsAppDecrypter;
        const processor = new N8NProcessor();
        
        // Processar dados do webhook
        const result = await processor.processForN8N(req.body);
        
        console.log('✅ Processamento concluído');
        res.json(result);
        
    } catch (error) {
        console.error('❌ Erro no processamento N8N:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.stack
        });
    }
});

// Rota de teste para seus dados específicos
app.post('/test/your-data', async (req, res) => {
    try {
        console.log('🧪 Testando com seus dados específicos');
        
        const { testarComSeusDados } = require('./n8n_decrypt');
        const result = await testarComSeusDados();
        
        res.json({
            success: true,
            message: 'Teste concluído com sucesso',
            result: result
        });
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
    console.error('❌ Erro interno:', error);
    res.status(500).json({
        error: 'Erro interno do servidor',
        details: error.message
    });
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`🚀 WhatsApp Decrypter API rodando na porta ${port}`);
    console.log(`📡 Endpoints disponíveis:`);
    console.log(`   GET  http://localhost:${port}/`);
    console.log(`   POST http://localhost:${port}/decrypt`);
    console.log(`   POST http://localhost:${port}/decrypt/buffer`);
    console.log(`   POST http://localhost:${port}/decrypt/file`);
    console.log(`   GET  http://localhost:${port}/health`);
});

module.exports = app;
