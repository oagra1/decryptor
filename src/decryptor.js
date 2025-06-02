const crypto = require('crypto');

/**
 * Decrypts WhatsApp media file
 */
async function decryptWhatsAppFile({ fileData, mediaKey, fileEncSha256, mimetype, fileName }) {
    try {
        // Convert base64 to buffers
        const encryptedBuffer = Buffer.from(fileData, 'base64');
        const mediaKeyBuffer = Buffer.from(mediaKey, 'base64');
        const expectedSha256 = Buffer.from(fileEncSha256, 'base64');

        // Verify file integrity
        const actualSha256 = crypto.createHash('sha256').update(encryptedBuffer).digest();
        if (!actualSha256.equals(expectedSha256)) {
            throw new Error('File integrity check failed - SHA256 mismatch');
        }

        // Expand media key using HKDF
        const expandedKey = hkdfExpand(mediaKeyBuffer, 112);
        
        // Extract keys
        const iv = expandedKey.slice(0, 16);
        const cipherKey = expandedKey.slice(16, 48);
        const macKey = expandedKey.slice(48, 80);

        // Extract MAC and encrypted data
        const fileMac = encryptedBuffer.slice(-10);
        const encryptedData = encryptedBuffer.slice(0, -10);

        // Verify MAC
        const calculatedMac = calculateMac(iv, encryptedData, macKey);
        if (!calculatedMac.slice(0, 10).equals(fileMac)) {
            throw new Error('MAC verification failed - file may be corrupted');
        }

        // Decrypt file
        const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
        const decrypted = Buffer.concat([
            decipher.update(encryptedData),
            decipher.final()
        ]);

        return {
            decryptedFile: decrypted.toString('base64'),
            mimetype: mimetype || 'application/octet-stream',
            fileName: fileName || 'decrypted_file',
            fileSize: decrypted.length
        };

    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

/**
 * HKDF Expand function for key derivation
 */
function hkdfExpand(mediaKey, length) {
    const salt = Buffer.from('WhatsApp Media Keys', 'utf8');
    const info = Buffer.alloc(0);
    
    // Extract
    const prk = crypto.createHmac('sha256', salt).update(mediaKey).digest();
    
    // Expand
    let expandedKey = Buffer.alloc(0);
    let previousBlock = Buffer.alloc(0);
    let counter = 1;

    while (expandedKey.length < length) {
        const hmac = crypto.createHmac('sha256', prk);
        hmac.update(previousBlock);
        hmac.update(info);
        hmac.update(Buffer.from([counter]));
        
        previousBlock = hmac.digest();
        expandedKey = Buffer.concat([expandedKey, previousBlock]);
        counter++;
    }

    return expandedKey.slice(0, length);
}

/**
 * Calculate MAC for verification
 */
function calculateMac(iv, encryptedData, macKey) {
    const hmac = crypto.createHmac('sha256', macKey);
    hmac.update(iv);
    hmac.update(encryptedData);
    return hmac.digest();
}

module.exports = { decryptWhatsAppFile };
