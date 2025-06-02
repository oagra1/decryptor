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
     * @param {Object} webhookData - Dados completos do webhook
     * @returns {Object} - Resultado com arquivo descriptografado
     */
    async processWhatsAppDocument(webhookData) {
        try {
            console.log('🔄 Processando documento do WhatsApp via N8N');
            
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
     * Extrai dados do documento do webhook do WhatsApp
     * @param {Object} data - Dados do webhook
     * @returns {Object} - Dados do documento extraídos
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
     * @param {string} url - URL do arquivo
     * @returns {Buffer} - Buffer do arquivo criptografado
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
     * @param {Buffer} encryptedBuffer - Buffer criptografado
     * @param {string} mediaKey - Chave de mídia em base64
     * @param {string} mimetype - Tipo MIME do arquivo
     * @returns {Buffer} - Buffer descriptografado
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
     * Função específica para seus dados do N8N
     * Usar com os dados exatos que você mostrou nas imagens
     */
    async processYourN8NData() {
        console.log('🎯 Processando SEUS dados específicos do N8N');
        console.log('═'.repeat(60));
        
        // Dados extraídos das suas imagens
        const yourData = {
            message: {
                documentMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7119-24/139703300_1359605348804309_2170912817383324698_n.enc?ccb=11-4&oh=01_Q5AaigFOU-g0q_zHrf7nc4zfrjak1VKiYVvrQjutOiqjnWqXoe=686542f-3k_nc_sid=5e03e0&_nc_hot=1748884740",
                    mimetype: "application/pdf",
                    title: "Script para reunião de vendas-20250513160001816",
                    fileSha256: "UKCacTl6GW+TgyBymL7GSS9YgSJnyImsLtXI0blNGM=",
                    fileLength: 375354,
                    pageCount: 12,
                    mediaKey: "No+4U0PSQpa/oLRIlbLFw26XR2770B4w3KH+EYMcyA=",
                    fileName: "Script para reunião de vendas-20250513160001816.pdf",
                    fileEncSha256: "j96rwwZ52ZznHutdNGvdekviI8PPo6QCMagnkvNZOXg0=",
                    directPath: "/v/t62.7119-24/139703300_1359605348804309_2170912817383324698_n.enc?ccb=11-4&oh=01_Q5AaigFOU-g0q_zHrf7nc4zfrjak1VKiYVvrQjutOiqjnWqXoe=686542f-3k_nc_sid=5e03e0&_nc_hot=1748884740"
                }
            }
        };
        
        try {
            const result = await this.processWhatsAppDocument(yourData);
            
            console.log('\n🎉 RESULTADO FINAL:');
            console.log('═'.repeat(40));
            console.log(`✅ Arquivo original: ${result.originalFileName}`);
            console.log(`✅ Arquivo descriptografado: ${result.decryptedFileName}`);
            console.log(`✅ Tamanho original: ${result.originalSize} bytes`);
            console.log(`✅ Tamanho final: ${result.decryptedSize} bytes`);
            console.log(`✅ Tipo: ${result.mimetype}`);
            console.log(`✅ Caminho: ${result.filePath}`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Erro:', error.message);
            throw error;
        }
    }

    /**
     * Função para usar no N8N - Format simplificado
     * @param {Object} n8nData - Dados recebidos do N8N
     * @returns {Object} - Dados para próximo nó do N8N
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

// Teste com seus dados reais
async function testarComSeusDados() {
    const processor = new N8NWhatsAppDecrypter();
    return await processor.processYourN8NData();
}

module.exports = {
    N8NWhatsAppDecrypter,
    decryptWhatsAppDocument,
    testarComSeusDados
};

// Se executado diretamente, testar com seus dados
if (require.main === module) {
    testarComSeusDados()
        .then(result => {
            console.log('\n🎯 PRONTO PARA USAR NO N8N!');
        })
        .catch(console.error);
}
