// decrypt.js
const crypto = require('crypto');
const fs = require('fs');

const decryptFile = async (encryptedPath, mediaKey, outputPath) => {
    try {
        const derivedKey = crypto.hkdfSync(
            'sha256',
            Buffer.from(mediaKey, 'base64'),
            '',
            'WhatsApp Media Key',
            112
        );

        const macKey = derivedKey.slice(0, 32);
        const cipherKey = derivedKey.slice(32, 64);
        const iv = derivedKey.slice(64, 80);

        const encryptedData = await fs.promises.readFile(encryptedPath);
        const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
        
        const decryptedBuffer = Buffer.concat([
            decipher.update(encryptedData),
            decipher.final()
        ]);

        await fs.promises.writeFile(outputPath, decryptedBuffer);
        return { status: 'success', path: outputPath };

    } catch (error) {
        console.error('Erro na descriptografia:', error);
        return { status: 'error', details: error.message };
    }
};

module.exports = { decryptFile };
