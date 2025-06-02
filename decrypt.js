const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class WhatsAppDecrypter {
    constructor() {
        this.algorithms = {
            image: 'aes-256-cbc',
            video: 'aes-256-cbc',
            audio: 'aes-256-cbc',
            document: 'aes-256-cbc'
        };
    }

    /**
     * Descriptografa um arquivo de mídia do WhatsApp
     * @param {Buffer} encryptedData - Dados criptografados do arquivo
     * @param {string} mediaKey - Chave de mídia em base64
     * @param {string} mediaType - Tipo de mídia (image, video, audio, document)
     * @returns {Buffer} - Dados descriptografados
     */
    decryptMedia(encryptedData, mediaKey, mediaType = 'document') {
        try {
            // Converte a mediaKey de base64 para buffer
            const keyBuffer = Buffer.from(mediaKey, 'base64');
            
            // Deriva as chaves usando HKDF
            const keys = this.deriveKeys(keyBuffer, mediaType);
            
            // Remove os últimos 10 bytes (MAC) do arquivo criptografado
            const mac = encryptedData.slice(-10);
            const encryptedFile = encryptedData.slice(0, -10);
            
            // Verifica o MAC
            if (!this.verifyMac(encryptedFile, mac, keys.macKey)) {
                throw new Error('Falha na verificação do MAC - arquivo pode estar corrompido');
            }
            
            // Extrai o IV (primeiros 16 bytes)
            const iv = encryptedFile.slice(0, 16);
            const encrypted = encryptedFile.slice(16);
            
            // Descriptografa o arquivo
            const decipher = crypto.createDecipheriv(this.algorithms[mediaType], keys.cipherKey, iv);
            let decrypted = decipher.update(encrypted);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            return decrypted;
            
        } catch (error) {
            throw new Error(`Erro na descriptografia: ${error.message}`);
        }
    }

    /**
     * Deriva as chaves de criptografia e MAC usando HKDF
     * @param {Buffer} keyBuffer - Chave principal
     * @param {string} mediaType - Tipo de mídia
     * @returns {Object} - Objeto com as chaves derivadas
     */
    deriveKeys(keyBuffer, mediaType) {
        const info = this.getInfoForMediaType(mediaType);
        
        // Deriva a chave de criptografia (32 bytes)
        const cipherKey = this.hkdfExpand(keyBuffer, info.cipher, 32);
        
        // Deriva a chave MAC (32 bytes)
        const macKey = this.hkdfExpand(keyBuffer, info.mac, 32);
        
        return { cipherKey, macKey };
    }

    /**
     * Implementação do HKDF Expand
     * @param {Buffer} prk - Chave pseudoaleatória
     * @param {Buffer} info - Informação de contexto
     * @param {number} length - Tamanho da chave desejada
     * @returns {Buffer} - Chave derivada
     */
    hkdfExpand(prk, info, length) {
        const hashLen = 32; // SHA-256
        const n = Math.ceil(length / hashLen);
        let okm = Buffer.alloc(0);
        let previousT = Buffer.alloc(0);

        for (let i = 1; i <= n; i++) {
            const hmac = crypto.createHmac('sha256', prk);
            hmac.update(previousT);
            hmac.update(info);
            hmac.update(Buffer.from([i]));
            previousT = hmac.digest();
            okm = Buffer.concat([okm, previousT]);
        }

        return okm.slice(0, length);
    }

    /**
     * Obtém as informações de contexto para cada tipo de mídia
     * @param {string} mediaType - Tipo de mídia
     * @returns {Object} - Informações de contexto
     */
    getInfoForMediaType(mediaType) {
        const contexts = {
            image: {
                cipher: Buffer.from('WhatsApp Image Keys'),
                mac: Buffer.from('WhatsApp Image MAC Keys')
            },
            video: {
                cipher: Buffer.from('WhatsApp Video Keys'),
                mac: Buffer.from('WhatsApp Video MAC Keys')
            },
            audio: {
                cipher: Buffer.from('WhatsApp Audio Keys'),
                mac: Buffer.from('WhatsApp Audio MAC Keys')
            },
            document: {
                cipher: Buffer.from('WhatsApp Document Keys'),
                mac: Buffer.from('WhatsApp Document MAC Keys')
            }
        };

        return contexts[mediaType] || contexts.document;
    }

    /**
     * Verifica a integridade do arquivo usando HMAC
     * @param {Buffer} data - Dados do arquivo
     * @param {Buffer} receivedMac - MAC recebido
     * @param {Buffer} macKey - Chave MAC
     * @returns {boolean} - True se o MAC é válido
     */
    verifyMac(data, receivedMac, macKey) {
        const hmac = crypto.createHmac('sha256', macKey);
        hmac.update(data);
        const calculatedMac = hmac.digest().slice(0, 10);
        
        return crypto.timingSafeEqual(receivedMac, calculatedMac);
    }

    /**
     * Descriptografa um arquivo do sistema de arquivos
     * @param {string} inputPath - Caminho do arquivo criptografado
     * @param {string} mediaKey - Chave de mídia em base64
     * @param {string} outputPath - Caminho de saída
     * @param {string} mediaType - Tipo de mídia
     * @returns {Promise<string>} - Caminho do arquivo descriptografado
     */
    async decryptFile(inputPath, mediaKey, outputPath, mediaType = 'document') {
        try {
            // Lê o arquivo criptografado
            const encryptedData = fs.readFileSync(inputPath);
            
            // Descriptografa
            const decryptedData = this.decryptMedia(encryptedData, mediaKey, mediaType);
            
            // Salva o arquivo descriptografado
            fs.writeFileSync(outputPath, decryptedData);
            
            console.log(`✅ Arquivo descriptografado salvo em: ${outputPath}`);
            return outputPath;
            
        } catch (error) {
            console.error(`❌ Erro ao descriptografar arquivo: ${error.message}`);
            throw error;
        }
    }

    /**
     * Descriptografa dados em buffer e retorna o resultado
     * @param {Buffer} encryptedBuffer - Buffer com dados criptografados
     * @param {string} mediaKey - Chave de mídia em base64
     * @param {string} mediaType - Tipo de mídia
     * @returns {Buffer} - Buffer com dados descriptografados
     */
    decryptBuffer(encryptedBuffer, mediaKey, mediaType = 'document') {
        return this.decryptMedia(encryptedBuffer, mediaKey, mediaType);
    }

    /**
     * Detecta o tipo de arquivo pelos magic bytes
     * @param {Buffer} buffer - Buffer do arquivo
     * @returns {string} - Extensão do arquivo detectada
     */
    detectFileType(buffer) {
        const signatures = {
            'ffd8ff': 'jpg',
            '89504e47': 'png',
            '47494638': 'gif',
            '25504446': 'pdf',
            '504b0304': 'zip',
            '504b0506': 'zip',
            '504b0708': 'zip',
            'd0cf11e0': 'doc',
            '504b': 'docx',
            'fffb': 'mp3',
            '494433': 'mp3',
            '000001ba': 'mp4',
            '000001b3': 'mp4',
            '66747970': 'mp4'
        };

        const hex = buffer.toString('hex', 0, 8).toLowerCase();
        
        for (const [signature, extension] of Object.entries(signatures)) {
            if (hex.startsWith(signature)) {
                return extension;
            }
        }
        
        return 'bin'; // Formato desconhecido
    }
}

module.exports = WhatsAppDecrypter;
