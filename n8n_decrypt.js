const WhatsAppDecrypter = require('./decrypt');
const fs = require('fs');

class N8NWhatsAppDecrypter {
    constructor() {
        this.decrypter = new WhatsAppDecrypter();
    }

    /**
     * FUNÇÃO SIMPLES - RECEBE DADOS, DESCRIPTOGRAFA, RETORNA
     */
    async processForN8N(data) {
        try {
            console.log('🔄 INÍCIO SIMPLES');
            
            let mediaKey, fileData, fileName = 'document.pdf', mimetype = 'application/pdf';
            
            // Se vier como array do N8N
            if (Array.isArray(data)) {
                mediaKey = data[0];
                fileName = data[1] || 'document.pdf';
                mimetype = data[2] || 'application/pdf'; 
                fileData = data[3];
            }
            // Se vier como objeto
            else {
                mediaKey = data.mediaKey;
                fileName = data.fileName || 'document.pdf';
                mimetype = data.mimetype || 'application/pdf';
                fileData = data.fileData;
            }
            
            console.log(`🔑 MediaKey: ${mediaKey ? 'OK' : 'FALTOU'}`);
            console.log(`📦 FileData: ${fileData ? 'OK' : 'FALTOU'}`);
            
            if (!mediaKey || !fileData) {
                throw new Error('MediaKey ou FileData ausentes');
            }
            
            // Converter para buffer
            const encryptedBuffer = Buffer.from(fileData, 'base64');
            console.log(`📏 Buffer: ${encryptedBuffer.length} bytes`);
            
            // Descriptografar
            this.decrypter.setDebug(true);
            const decryptedBuffer = this.decrypter.decryptBuffer(encryptedBuffer, mediaKey, 'document');
            
            console.log(`✅ SUCESSO: ${decryptedBuffer.length} bytes`);
            
            // Salvar e retornar
            const outputFile = `decrypted_${Date.now()}.pdf`;
            fs.writeFileSync(outputFile, decryptedBuffer);
            
            return {
                json: {
                    success: true,
                    fileName: outputFile,
                    size: decryptedBuffer.length,
                    fileBase64: decryptedBuffer.toString('base64')
                }
            };
            
        } catch (error) {
            console.error('❌ ERRO:', error.message);
            return {
                json: {
                    success: false,
                    error: error.message
                }
            };
        }
    }
}

module.exports = { N8NWhatsAppDecrypter };
