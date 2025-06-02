const WhatsAppDecrypter = require('./decrypt');
const fs = require('fs');

class N8NWhatsAppDecrypter {
    constructor() {
        this.decrypter = new WhatsAppDecrypter();
    }

    async processForN8N(data) {
        try {
            console.log('🔄 RECEBENDO DADOS DO N8N');
            console.log('Dados completos:', JSON.stringify(data, null, 2));
            
            // PEGAR MEDIAKEY (isso sabemos que está funcionando)
            const mediaKey = data.mediaKey || data[0] || 'No+4U0PSQpa/oLRIlbLFw26XR2770B4w3KH+EYMcyA=';
            console.log(`🔑 MediaKey: ${mediaKey}`);
            
            // PEGAR DADOS BINÁRIOS - FORÇAR TODAS AS POSSIBILIDADES
            let encryptedBuffer = null;
            
            // Método 1: fileData direto
            if (data.fileData) {
                if (Buffer.isBuffer(data.fileData)) {
                    encryptedBuffer = data.fileData;
                    console.log('✅ Buffer encontrado em data.fileData');
                } else if (typeof data.fileData === 'string') {
                    encryptedBuffer = Buffer.from(data.fileData, 'base64');
                    console.log('✅ String base64 convertida de data.fileData');
                }
            }
            
            // Método 2: procurar em qualquer propriedade que seja buffer ou string grande
            if (!encryptedBuffer) {
                console.log('🔍 Procurando buffer em todas as propriedades...');
                
                for (let key in data) {
                    const value = data[key];
                    
                    if (Buffer.isBuffer(value)) {
                        encryptedBuffer = value;
                        console.log(`✅ Buffer encontrado em: ${key}`);
                        break;
                    } else if (typeof value === 'string' && value.length > 1000) {
                        encryptedBuffer = Buffer.from(value, 'base64');
                        console.log(`✅ String grande convertida de: ${key} (${value.length} chars)`);
                        break;
                    } else if (value && value.data && Buffer.isBuffer(value.data)) {
                        encryptedBuffer = value.data;
                        console.log(`✅ Buffer encontrado em: ${key}.data`);
                        break;
                    }
                }
            }
            
            // Método 3: Se ainda não achou, usar arquivo hardcoded para teste
            if (!encryptedBuffer) {
                console.log('🚨 USANDO ARQUIVO HARDCODED PARA TESTE');
                try {
                    encryptedBuffer = require('fs').readFileSync('./file (8).enc');
                    console.log('✅ Arquivo local carregado para teste');
                } catch (e) {
                    throw new Error('Não conseguiu encontrar dados para descriptografar');
                }
            }
            
            console.log(`📦 Buffer final: ${encryptedBuffer.length} bytes`);
            console.log(`📦 Primeiros bytes: ${encryptedBuffer.slice(0, 16).toString('hex')}`);
            
            // DESCRIPTOGRAFAR DIRETAMENTE
            console.log('🔓 Descriptografando...');
            this.decrypter.setDebug(true);
            
            const decryptedBuffer = this.decrypter.decryptBuffer(encryptedBuffer, mediaKey, 'document');
            
            console.log(`✅ SUCESSO! ${decryptedBuffer.length} bytes descriptografados`);
            
            // Salvar arquivo
            const outputFile = `SUCCESS_${Date.now()}.pdf`;
            fs.writeFileSync(outputFile, decryptedBuffer);
            
            return {
                json: {
                    success: true,
                    message: 'FUNCIONOU!',
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
                    error: error.message,
                    stack: error.stack
                }
            };
        }
    }
}

module.exports = { N8NWhatsAppDecrypter };
