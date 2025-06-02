const WhatsAppDecrypter = require('./decrypt');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

class N8NWhatsAppDecrypter {
    constructor() {
        this.decrypter = new WhatsAppDecrypter();
    }

    /**
     * Processa dados recebidos do webhook N8N do WhatsApp
     */
    async processWhatsAppDocument(webhookData) {
        try {
            console.log('🔄 Processando documento do WhatsApp via N8N');
            console.log('📦 DADOS COMPLETOS RECEBIDOS:');
            console.log(JSON.stringify(webhookData, null, 2));
            console.log('📋 CHAVES DISPONÍVEIS:', Object.keys(webhookData));
            
            // Se vier direto do N8N com arquivo baixado
            if (webhookData.binary && webhookData.json) {
                console.log('🎯 Detectado formato N8N com binary data');
                return await this.processN8NBinaryData(webhookData);
            }
            
            // Extrair dados relevantes do webhook
            const documentMessage = this.extractDocumentData(webhookData);
            
            if (!documentMessage) {
                throw new Error('Nenhum documento encontrado no webhook');
            }
            
            console.log('📋 Dados extraídos:');
            console.log(`   📄 Arquivo: ${documentMessage.fileName}`);
            console.log(`   🔗 URL: ${documentMessage.url}`);
            console.log(`   🔑 MediaKey: ${documentMessage.mediaKey.substring(0, 20)}...`);
            console.log(`   📏 Tamanho: ${documentMessage.fileLength} bytes`);
            console.log(`   📁 Tipo: ${documentMessage.mimetype}`);
            
            // Baixar o arquivo criptografado
            console.log('\n⬇️ Baixando arquivo criptografado...');
            const encryptedBuffer = await this.downloadFile(documentMessage.url);
            
            // Descriptografar o arquivo
            console.log('\n🔓 Descriptografando arquivo...');
            const decryptedBuffer = await this.decryptFile(
                encryptedBuffer, 
                documentMessage.mediaKey,
                documentMessage.mimetype
            );
            
            // Salvar arquivo descriptografado
            const outputFileName = `decrypted_${Date.now()}_${documentMessage.fileName}`;
            fs.writeFileSync(outputFileName, decryptedBuffer);
            
            console.log(`\n✅ SUCESSO!`);
            console.log(`   📁 Arquivo descriptografado: ${outputFileName}`);
            console.log(`   📏 Tamanho final: ${decryptedBuffer.length} bytes`);
            
            return {
                success: true,
                originalFileName: documentMessage.fileName,
                decryptedFileName: outputFileName,
                originalSize: documentMessage.fileLength,
                decryptedSize: decryptedBuffer.length,
                mimetype: documentMessage.mimetype,
                filePath: outputFileName,
                buffer: decryptedBuffer
            };
            
        } catch (error) {
            console.error('❌ Erro no processamento:', error.message);
            throw error;
        }
    }

    /**
     * Processa dados binários diretos do N8N
     */
    async processN8NBinaryData(n8nData) {
        try {
            console.log('🔄 Processando dados binários do N8N');
            
            // Pegar dados do JSON
            const jsonData = n8nData.json;
            const mediaKey = jsonData.mediaKey || 'SUA_MEDIA_KEY_AQUI';
            const fileName = jsonData.fileName || 'document.pdf';
            const mimetype = jsonData.mimetype || 'application/pdf';
            
            // Pegar arquivo binário
            const binaryData = n8nData.binary.data;
            const encryptedBuffer = Buffer.from(binaryData.data, binaryData.encoding || 'base64');
            
            console.log(`📋 Dados do N8N:
   📄 Arquivo: ${fileName}
   🔑 MediaKey: ${mediaKey.substring(0, 20)}...
   📏 Tamanho: ${encryptedBuffer.length} bytes
   📁 Tipo: ${mimetype}`);
            
            // Descriptografar
            console.log('\n🔓 Descriptografando arquivo...');
            const decryptedBuffer = await this.decryptFile(encryptedBuffer, mediaKey, mimetype);
            
            // Salvar arquivo
            const outputFileName = `decrypted_${Date.now()}_${fileName}`;
            fs.writeFileSync(outputFileName, decryptedBuffer);
            
            console.log(`✅ Arquivo descriptografado: ${outputFileName}`);
            
            return {
                success: true,
                originalFileName: fileName,
                decryptedFileName: outputFileName,
                originalSize: encryptedBuffer.length,
                decryptedSize: decryptedBuffer.length,
                mimetype: mimetype,
                filePath: outputFileName,
                buffer: decryptedBuffer
            };
            
        } catch (error) {
            console.error('❌ Erro no processamento N8N:', error.message);
            throw error;
        }
    }

    /**
     * Extrai dados do documento do webhook do WhatsApp
     */
    extractDocumentData(data) {
        try {
            // Estrutura típica do webhook do WhatsApp
            let documentMessage = null;
            
            // Buscar em diferentes possíveis estruturas
            if (data.message && data.message.documentMessage) {
                documentMessage = data.message.documentMessage;
            } else if (data.documentMessage) {
                documentMessage = data.documentMessage;
            } else if (data.body && data.body.message && data.body.message.documentMessage) {
                documentMessage = data.body.message.documentMessage;
            }
            
            if (!documentMessage) {
                throw new Error('Estrutura de documento não encontrada');
            }
            
            // Validar campos obrigatórios
            const requiredFields = ['url', 'mediaKey', 'fileLength'];
            for (const field of requiredFields) {
                if (!documentMessage[field]) {
                    throw new Error(`Campo obrigatório ausente: ${field}`);
                }
            }
            
            return {
                url: documentMessage.url,
                mediaKey: documentMessage.mediaKey,
                fileLength: documentMessage.fileLength,
                fileName: documentMessage.fileName || `document_${Date.now()}.pdf`,
                mimetype: documentMessage.mimetype || 'application/pdf',
                fileSha256: documentMessage.fileSha256,
                fileEncSha256: documentMessage.fileEncSha256,
                pageCount: documentMessage.pageCount
            };
            
        } catch (error) {
            console.error('❌ Erro na extração de dados:', error.message);
            throw error;
        }
    }

    /**
     * Baixa o arquivo criptografado do WhatsApp
     */
    async downloadFile(url) {
        try {
            console.log(`   🌐 Baixando de: ${url.substring(0, 80)}...`);
            
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'WhatsApp/2.21.0'
                }
            });
            
            const buffer = Buffer.from(response.data);
            console.log(`   ✅ Arquivo baixado: ${buffer.length} bytes`);
            
            return buffer;
            
        } catch (error) {
            throw new Error(`Erro ao baixar arquivo: ${error.message}`);
        }
    }

    /**
     * Descriptografa o arquivo usando a mediaKey
     */
    async decryptFile(encryptedBuffer, mediaKey, mimetype) {
        try {
            // Determinar tipo de mídia baseado no mimetype
            let mediaType = 'document';
            if (mimetype.startsWith('image/')) mediaType = 'image';
            else if (mimetype.startsWith('video/')) mediaType = 'video';
            else if (mimetype.startsWith('audio/')) mediaType = 'audio';
            
            console.log(`   🔧 Usando tipo de mídia: ${mediaType}`);
            console.log(`   🔑 MediaKey: ${mediaKey.substring(0, 30)}...`);
            console.log(`   📦 Tamanho criptografado: ${encryptedBuffer.length} bytes`);
            
            // Ativar debug para troubleshooting
            this.decrypter.setDebug(true);
            
            // Descriptografar
            const decryptedBuffer = this.decrypter.decryptBuffer(
                encryptedBuffer, 
                mediaKey, 
                mediaType
            );
            
            console.log(`   ✅ Descriptografia concluída: ${decryptedBuffer.length} bytes`);
            
            return decryptedBuffer;
            
        } catch (error) {
            throw new Error(`Erro na descriptografia: ${error.message}`);
        }
    }

    /**
     * Função para usar no N8N - Format simplificado
     */
    async processForN8N(n8nData) {
        try {
            const result = await this.processWhatsAppDocument(n8nData);
            
            // Retornar dados no formato que o N8N espera
            return {
                json: {
                    success: true,
                    decryptedFile: result.decryptedFileName,
                    filePath: result.filePath,
                    originalSize: result.originalSize,
                    decryptedSize: result.decryptedSize,
                    mimetype: result.mimetype,
                    fileName: result.originalFileName,
                    // Buffer em base64 para enviar para IA
                    fileBase64: result.buffer.toString('base64')
                }
            };
            
        } catch (error) {
            return {
                json: {
                    success: false,
                    error: error.message,
                    details: error.stack
                }
            };
        }
    }
}

// Função principal para usar no N8N
async function decryptWhatsAppDocument(webhookData) {
    const processor = new N8NWhatsAppDecrypter();
    return await processor.processForN8N(webhookData);
}

module.exports = {
    N8NWhatsAppDecrypter,
    decryptWhatsAppDocument
};
