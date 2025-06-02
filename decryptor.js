const crypto = require('crypto');

/**
 * Decrypts WhatsApp media file
 * @param {Buffer} encryptedBuffer - Encrypted file buffer
 * @param {string} mediaKeyBase64 - Base64 encoded media key
 * @param {string} fileEncSha256Base64 - Base64 encoded SHA256 of encrypted file
 * @returns {Buffer} Decrypted file buffer
 */
async function decryptWhatsAppMedia(encryptedBuffer, mediaKeyBase64, fileEncSha256Base64) {
    try {
        // Convert base64 inputs to buffers
        const mediaKey = Buffer.from(mediaKeyBase64, 'base64');
        const expectedSha256 = Buffer.from(fileEncSha256Base64, 'base64');

        // Verify file integrity
        const actualSha256 = crypto.createHash('sha256').update(encryptedBuffer).digest();
        if (!actualSha256.equals(expectedSha256)) {
            throw new Error('File integrity check failed - SHA256 mismatch');
        }

        // Expand media key using HKDF
        const expandedKey = expandMediaKey(mediaKey);
        
        // Extract components
        const iv = expandedKey.slice(0, 16);
        const cipherKey = expandedKey.slice(16, 48);
        const macKey = expandedKey.slice(48, 80);

        // Extract MAC from end of file
        const fileMac = encryptedBuffer.slice(-10);
        const encryptedData = encryptedBuffer.slice(0, -10);

        // Verify MAC
        const hmac = crypto.createHmac('sha256', macKey);
        hmac.update(iv);
        hmac.update(encryptedData);
        const calculatedMac = hmac.digest();
        
        if (!calculatedMac.slice(0, 10).equals(fileMac)) {
            throw new Error('MAC verification failed - file may be corrupted');
        }

        // Decrypt file
        const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
        const decrypted = Buffer.concat([
            decipher.update(encryptedData),
            decipher.final()
        ]);

        return decrypted;

    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

/**
 * Expands media key using HKDF-SHA256
 * @param {Buffer} mediaKey - 32 byte media key
 * @returns {Buffer} 112 byte expanded key
 */
function expandMediaKey(mediaKey) {
    const salt = Buffer.from('WhatsApp Media Keys', 'utf8');
    
    // HKDF Extract
    const prk = crypto.createHmac('sha256', salt).update(mediaKey).digest();
    
    // HKDF Expand (we need 112 bytes)
    const keyLength = 112;
    let expandedKey = Buffer.alloc(0);
    let previousBlock = Buffer.alloc(0);
    let counter = 1;

    while (expandedKey.length < keyLength) {
        const hmac = crypto.createHmac('sha256', prk);
        hmac.update(previousBlock);
        hmac.update(Buffer.alloc(0)); // empty info
        hmac.update(Buffer.from([counter]));
        
        previousBlock = hmac.digest();
        expandedKey = Buffer.concat([expandedKey, previousBlock]);
        counter++;
    }

    return expandedKey.slice(0, keyLength);
}

module.exports = { decryptWhatsAppMedia };
