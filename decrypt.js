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
        this.debug = true; // Ativar debug
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
            if (this.debug) {
                console.log('🔍 DEBUG - Iniciando descriptografia:');
                console.log(`   📦 Tamanho dos dados: ${encryptedData.length} bytes`);
                console.log(`   🔑 MediaKey (primeiros 20 chars): ${mediaKey.substring(0, 20)}...`);
                console.log(`   🏷️  Tipo de mídia: ${mediaType}`);
            }

            // Converte a mediaKey de base64 para buffer
            const keyBuffer = Buffer.from(mediaKey, 'base64');
            
            if (this.debug) {
                console.log(`   🔐 Tamanho da chave: ${keyBuffer.length} bytes`);
            }
            
            // Deriva as chaves usando HKDF
            const keys = this.deriveKeys(keyBuffer, mediaType);
            
            if (this.debug) {
                console.log(`   🔧 Chaves derivadas - Cipher: ${keys.cipherKey.length}b, MAC: ${keys.macKey.length}b`);
            }
            
            // Diferentes abordagens para estruturas de arquivo
            let decrypted;
            
            // Tentar primeiro a abordagem padrão (com MAC no final)
            try {
                decrypted = this.decryptStandardFormat(encryptedData, keys, mediaType);
                if (this.debug) console.log('✅ Sucesso com formato padrão');
                return decrypted;
            } catch (error) {
                if (this.debug) console.log('❌ Formato padrão falhou:', error.message);
            }
            
            // Tentar sem verificação MAC (alguns casos especiais)
            try {
                decrypted = this.decryptWithoutMac(encryptedData, keys, mediaType);
                if (this.debug) console.log('✅ Sucesso sem verificação MAC');
                return decrypted;
            } catch (error) {
                if (this.debug) console.log('❌ Descriptografia sem MAC falhou:', error.message);
            }
            
            // Tentar formato alternativo (MAC no início)
            try {
                decrypted = this.decryptAlternativeFormat(encryptedData, keys, mediaType);
                if (this.debug) console.log('✅ Sucesso com formato alternativo');
                return decrypted;
            } catch (error) {
                if (this.debug) console.log('❌ Formato alternativo falhou:', error.message);
            }
            
            throw new Error('Não foi possível descriptografar com nenhum formato conhecido');
            
        } catch (error) {
            console.error('❌ Erro geral na descriptografia:', error.message);
            throw new Error(`Erro na descriptografia: ${error.message}`);
        }
    }

    /**
     * Tentativa 1: Formato padrão do WhatsApp (MAC no final)
     */
    decryptStandardFormat(encryptedData, keys, mediaType) {
        // Remove os últimos 10 bytes (MAC) do arquivo criptografado
        const mac = encryptedData.slice(-10);
        const encryptedFile = encryptedData.slice(0, -10);
        
        if (this.debug) {
            console.log(`   📏 Dados sem MAC: ${encryptedFile.length} bytes`);
            console.log(`   🔒 MAC: ${mac.toString('hex')}`);
        }
        
        // Verifica o MAC
        if (!this.verifyMac(encryptedFile, mac, keys.macKey)) {
            throw new Error('Falha na verificação do MAC - formato padrão');
        }
        
        // Extrai o IV (primeiros 16 bytes)
        const iv = encryptedFile.slice(0, 16);
        const encrypted = encryptedFile.slice(16);
        
        if (this.debug) {
            console.log(`   🎲 IV: ${iv.toString('hex')}`);
            console.log(`   📦 Dados criptografados: ${encrypted.length} bytes`);
        }
        
        // Descriptografa o arquivo
        const decipher = crypto.createDecipheriv(this.algorithms[mediaType], keys.cipherKey, iv);
        decipher.setAutoPadding(true);
        
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted;
    }

    /**
     * Tentativa 2: Sem verificação MAC
     */
    decryptWithoutMac(encryptedData, keys, mediaType) {
        // Assume que os primeiros 16 bytes são o IV
        const iv = encryptedData.slice(0, 16);
        const encrypted = encryptedData.slice(16);
        
        if (this.debug) {
            console.log(`   🎲 IV (sem MAC): ${iv.toString('hex')}`);
            console.log(`   📦 Dados (sem MAC): ${encrypted.length} bytes`);
        }
        
        // Descriptografa o arquivo
        const decipher = crypto.createDecipheriv(this.algorithms[mediaType], keys.cipherKey, iv);
        decipher.setAutoPadding(true);
        
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted;
    }

    /**
     * Tentativa 3: Formato alternativo (MAC no início)
     */
    decryptAlternativeFormat(encryptedData, keys, mediaType) {
        // MAC nos primeiros 10 bytes
        const mac = encryptedData.slice(0, 10);
        const encryptedFile = encryptedData.slice(10);
        
        if (this.debug) {
            console.log(`   🔒 MAC (alternativo): ${mac.toString('hex')}`);
            console.log(`   📏 Dados sem MAC (alt): ${encryptedFile.length} bytes`);
        }
        
        // Verifica o MAC
        if (!this.verifyMac(encryptedFile, mac, keys.macKey)) {
            throw new Error('Falha na verificação do MAC - formato alternativo');
        }
        
        // Extrai o IV (primeiros 16 bytes)
        const iv = encryptedFile.slice(0, 16);
        const encrypted = encryptedFile.slice(16);
        
        // Descriptografa o arquivo
        const decipher = crypto.createDecipheriv(this.algorithms[mediaType], keys.cipherKey, iv);
        decipher.setAutoPadding(true);
        
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted;
    }

    /**
     * Deriva as chaves de criptografia e MAC usando HKDF
     */
    deriveKeys(keyBuffer, mediaType) {
        const info = this.getInfoForMediaType(mediaType);
        
        if (this.debug) {
            console.log(`   🔍 Info cipher: ${info.cipher.toString()}`);
            console.log(`   🔍 Info MAC: ${info.mac.toString()}`);
        }
        
        // Deriva a chave de criptografia (32 bytes)
        const cipherKey = this.hkdfExpand(keyBuffer, info.cipher, 32);
        
        // Deriva a chave MAC (32 bytes)
        const macKey = this.hkdfExpand(keyBuffer, info.mac, 32);
        
        return { cipherKey, macKey };
    }

    /**
     * Implementação do HKDF Expand
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
     */
    verifyMac(data, receivedMac, macKey) {
        const hmac = crypto.createHmac('sha256', macKey);
        hmac.update(data);
        const calculatedMac = hmac.digest().slice(0, 10);
        
        if (this.debug) {
            console.log(`   🔍 MAC recebido: ${receivedMac.toString('hex')}`);
            console.log(`   🔍 MAC calculado: ${calculatedMac.toString('hex')}`);
        }
        
        return crypto.timingSafeEqual(receivedMac, calculatedMac);
    }

    /**
     * Descriptografa um arquivo do sistema de arquivos
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
     */
    decryptBuffer(encryptedBuffer, mediaKey, mediaType = 'document') {
        return this.decryptMedia(encryptedBuffer, mediaKey, mediaType);
    }

    /**
     * Detecta o tipo de arquivo pelos magic bytes
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
        
        if (this.debug) {
            console.log(`   🔍 Magic bytes: ${hex}`);
        }
        
        for (const [signature, extension] of Object.entries(signatures)) {
            if (hex.startsWith(signature)) {
                if (this.debug) {
                    console.log(`   📁 Tipo detectado: ${extension}`);
                }
                return extension;
            }
        }
        
        if (this.debug) {
            console.log(`   📁 Tipo desconhecido, usando: bin`);
        }
        return 'bin';
    }

    /**
     * Função auxiliar para debug de dados
     */
    debugData(data, label) {
        if (this.debug && data) {
            console.log(`   🔍 ${label}:`);
            console.log(`      Tamanho: ${data.length} bytes`);
            console.log(`      Primeiros 16 bytes: ${data.slice(0, 16).toString('hex')}`);
            console.log(`      Últimos 16 bytes: ${data.slice(-16).toString('hex')}`);
        }
    }

    /**
     * Ativar/desativar debug
     */
    setDebug(enabled) {
        this.debug = enabled;
    }
}

module.exports = WhatsAppDecrypter;
