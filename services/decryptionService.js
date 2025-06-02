const crypto = require('crypto');

class DecryptionService {
    /**
     * Decrypts WhatsApp media file
     * @param {Object} params - Decryption parameters
     * @param {string} params.fileData - Base64 encoded encrypted file data
     * @param {string} params.mediaKey - Base64 encoded media key
     * @param {string} params.fileEncSha256 - Base64 encoded SHA256 of encrypted file
     * @param {string} params.mimetype - MIME type of the file
     * @param {string} params.fileName - Original file name
     * @returns {Object} Decrypted file data and metadata
     */
    async decryptWhatsAppMedia(params) {
        const { fileData, mediaKey, fileEncSha256, mimetype, fileName } = params;

        try {
            // Convert base64 strings to buffers
            const encryptedData = Buffer.from(fileData, 'base64');
            const mediaKeyBuffer = Buffer.from(mediaKey, 'base64');
            const expectedHash = Buffer.from(fileEncSha256, 'base64');

            // Verify file integrity by checking SHA256
            const actualHash = crypto.createHash('sha256').update(encryptedData).digest();
            
            if (!actualHash.equals(expectedHash)) {
                throw new Error('File integrity check failed. SHA256 mismatch.');
            }

            // WhatsApp uses AES-256-CBC for media encryption
            // The media key contains both the AES key and IV
            const expandedKey = this.expandMediaKey(mediaKeyBuffer);
            
            // Extract encryption parameters
            const iv = expandedKey.slice(0, 16);
            const cipherKey = expandedKey.slice(16, 48);
            const macKey = expandedKey.slice(48, 80);

            // Remove the MAC (last 10 bytes) from encrypted data
            const fileMac = encryptedData.slice(-10);
            const encryptedFileData = encryptedData.slice(0, -10);

            // Verify MAC
            const mac = this.calculateMac(iv, encryptedFileData, macKey);
            if (!mac.slice(0, 10).equals(fileMac)) {
                throw new Error('MAC verification failed. File may be corrupted.');
            }

            // Decrypt the file
            const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
            const decryptedData = Buffer.concat([
                decipher.update(encryptedFileData),
                decipher.final()
            ]);

            // Calculate SHA256 of decrypted file
            const decryptedHash = crypto.createHash('sha256').update(decryptedData).digest();

            return {
                decryptedData: decryptedData.toString('base64'),
                mimetype: mimetype || 'application/octet-stream',
                fileName: fileName || 'decrypted_file',
                fileSize: decryptedData.length,
                sha256: decryptedHash.toString('base64')
            };

        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }

    /**
     * Expands the media key using HKDF (HMAC-based Key Derivation Function)
     * @param {Buffer} mediaKey - The media key buffer
     * @returns {Buffer} Expanded key (112 bytes)
     */
    expandMediaKey(mediaKey) {
        // WhatsApp uses HKDF with SHA256
        const salt = Buffer.from('WhatsApp Media Keys', 'utf8');
        const info = Buffer.alloc(0); // Empty info
        const keyLength = 112; // We need 112 bytes (16 IV + 32 cipher key + 64 mac key)

        // HKDF Extract
        const prk = crypto.createHmac('sha256', salt).update(mediaKey).digest();

        // HKDF Expand
        let expandedKey = Buffer.alloc(0);
        let previousBlock = Buffer.alloc(0);
        let counter = 1;

        while (expandedKey.length < keyLength) {
            const hmac = crypto.createHmac('sha256', prk);
            hmac.update(previousBlock);
            hmac.update(info);
            hmac.update(Buffer.from([counter]));
            
            previousBlock = hmac.digest();
            expandedKey = Buffer.concat([expandedKey, previousBlock]);
            counter++;
        }

        return expandedKey.slice(0, keyLength);
    }

    /**
     * Calculates MAC for integrity verification
     * @param {Buffer} iv - Initialization vector
     * @param {Buffer} encryptedData - Encrypted file data
     * @param {Buffer} macKey - MAC key
     * @returns {Buffer} Calculated MAC
     */
    calculateMac(iv, encryptedData, macKey) {
        const hmac = crypto.createHmac('sha256', macKey);
        hmac.update(iv);
        hmac.update(encryptedData);
        return hmac.digest();
    }
}

module.exports = new DecryptionService();
