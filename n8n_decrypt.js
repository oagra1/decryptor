const WhatsAppDecrypter = require('./decrypt');
const fs = require('fs');

class N8NWhatsAppDecrypter {
    constructor() {
        this.decrypter = new WhatsAppDecrypter();
    }

    /**
     * Função DEFINITIVA para N8N - SEM COMPLICAÇÃO
     */
    async processForN8N(data) {
        try {
            console.log('🔄 PROCESSAMENTO N8N FINAL');
            console.log('📦 Dados recebidos completos:', JSON.stringify(data, null, 2));
            console.log('📦 Tipo dos dados:', typeof data);
            console.log('📦 É array?', Array.isArray(data));
            
            // BUSCAR OS DADOS EXATAMENTE COMO VÊM DO N8N
            let mediaKey, fileName, mimetype, fileData;
            
            // Método 1: Dados como ARRAY (seu caso atual)
            if (Array.isArray(data) && data.length >= 4) {
                mediaKey = data[0];
                fileName = data[1] || 'document.pdf';
                mimetype = data[2] || 'application/pdf';
                fileData = data[3];
                console.log('✅ Encontrado como array: [mediaKey, fileName, mimetype, fileData]');
            }
            // Método 2: Dados diretos no root
            else if (data.mediaKey && data.fileData) {
                mediaKey = data.mediaKey;
                fileName = data.fileName || 'document.pdf';
                mimetype = data.mimetype || 'application/pdf';
                fileData = data.fileData;
                console.log('✅ Encontrado no root dos dados');
            }
            // Método 3: Dentro de body.data (estrutura N8N)
            else if (data.body && data.body.data) {
                const bodyData = data.body.data;
                mediaKey = bodyData.mediaKey;
                fileName = bodyData.fileName || 'document.pdf';
                mimetype = bodyData.mimetype || 'application/pdf';
                fileData = bodyData.fileData;
                console.log('✅ Encontrado em body.data');
            }
            // Método 4: Estrutura WhatsApp webhook
            else if (data.message && data.message.documentMessage) {
                const doc = data.message.documentMessage;
                mediaKey = doc.mediaKey;
                fileName = doc.fileName || 'document.pdf';
                mimetype = doc.mimetype || 'application/pdf';
                // Para webhook, precisamos baixar o arquivo
                console.log('✅ Estrutura webhook WhatsApp detectada');
                return await this.processWebhookData(data);
            }
            else {
                console.log('❌ Estrutura não reconhecida');
                console.log('Chaves disponíveis:', Object.keys(data));
                console.log('Dados completos:', data);
                throw new Error(`Estrutura não reconhecida. Tipo: ${typeof data}, É array: ${Array.isArray(data)}, Chaves: ${Object.keys(data).join(', ')}`);
            }
            
            console.log('🔍 Dados extraídos:');
            console.log(`   MediaKey: ${mediaKey ? mediaKey.substring(0, 20) + '...' : 'NÃO ENCONTRADA'}`);
            console.log(`   FileName: ${fileName}`);
            console.log(`   MimeType: ${mimetype}`);
            console.log(`   FileData: ${fileData ? 'PRESENTE' : 'AUSENTE'}`);
            
            // Validação
            if (!mediaKey) {
                throw new Error('MediaKey não encontrada nos dados');
            }
            
            if (!fileData) {
                throw new Error('FileData não encontrada nos dados');
            }
            
            // Converter fileData para buffer
            console.log('📦 Convertendo fileData...');
            let encryptedBuffer;
            
            if (typeof fileData === 'string') {
                // Base64 string
                encryptedBuffer = Buffer.from(fileData, 'base64');
            } else if (Buffer.isBuffer(fileData)) {
                // Já é buffer
                encryptedBuffer = fileData;
            } else if (fileData.data) {
                // Objeto com propriedade data
                encryptedBuffer = Buffer.from(fileData.data, fileData.encoding || 'base64');
            } else {
                throw new Error('Formato de fileData não reconhecido');
            }
            
            console.log(`📏 Buffer criado: ${encryptedBuffer.length} bytes`);
            
            // Determinar tipo de mídia
            let mediaType = 'document';
            if (mimetype && mimetype.startsWith('image/')) mediaType = 'image';
            else if (mimetype && mimetype.startsWith('video/')) mediaType = 'video';
            else if (mimetype && mimetype.startsWith('audio/')) mediaType = 'audio';
            
            console.log(`🎯 Tipo de mídia determinado: ${mediaType}`);
            
            // Ativar debug no decrypter
            this.decrypter.setDebug(true);
            
            // Descriptografar
            console.log('🔓 Iniciando descriptografia...');
            const decryptedBuffer = this.decrypter.decryptBuffer(encryptedBuffer, mediaKey, mediaType);
            
            console.log(`✅ Descriptografia bem-sucedida: ${decryptedBuffer.length} bytes`);
            
            // Detectar tipo de arquivo
            const detectedType = this.decrypter.detectFileType(decryptedBuffer);
            console.log(`📁 Tipo detectado: ${detectedType}`);
            
            // Salvar arquivo
            const outputFileName = `decrypted_${Date.now()}_${fileName}`;
            fs.writeFileSync(outputFileName, decryptedBuffer);
            
            console.log(`💾 Arquivo salvo: ${outputFileName}`);
            
            // Retornar resultado no formato N8N
            return {
                json: {
                    success: true,
                    fileName: fileName,
                    decryptedFile: outputFileName,
                    originalSize: encryptedBuffer.length,
                    decryptedSize: decryptedBuffer.length,
                    mimetype: mimetype,
                    detectedType: detectedType,
                    filePath: outputFileName,
                    fileBase64: decryptedBuffer.toString('base64')
                }
            };
            
        } catch (error) {
            console.error('❌ ERRO FINAL:', error.message);
            console.error('Stack completo:', error.stack);
            
            return {
                json: {
                    success: false,
                    error: error.message,
                    details: error.stack,
                    debugInfo: {
                        receivedKeys: Object.keys(data),
                        hasMediaKey: !!(data.mediaKey || (data.body && data.body.data && data.body.data.mediaKey)),
                        hasFileData: !!(data.fileData || (data.body && data.body.data && data.body.data.fileData)),
                        dataStructure: typeof data
                    }
                }
            };
        }
    }

    /**
     * Processa dados de webhook WhatsApp (baixa arquivo)
     */
    async processWebhookData(data) {
        console.log('🌐 Processando webhook WhatsApp...');
        // Implementar se necessário
        throw new Error('Webhook WhatsApp não implementado ainda');
    }
}

module.exports = {
    N8NWhatsAppDecrypter
};
