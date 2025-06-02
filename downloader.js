const axios = require('axios');

/**
 * Downloads file from URL
 * @param {string} url - URL to download from
 * @returns {Buffer} File buffer
 */
async function downloadFile(url) {
    try {
        console.log(`[DOWNLOAD] Starting download from: ${url.substring(0, 50)}...`);
        
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer',
            timeout: 60000, // 60 seconds timeout
            maxContentLength: 200 * 1024 * 1024, // 200MB limit
            maxBodyLength: 200 * 1024 * 1024,
            headers: {
                'User-Agent': 'WhatsApp/2.23.20.0'
            }
        });

        const buffer = Buffer.from(response.data);
        console.log(`[DOWNLOAD] Complete. Size: ${buffer.length} bytes`);
        
        return buffer;

    } catch (error) {
        if (error.response) {
            throw new Error(`Download failed: HTTP ${error.response.status}`);
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('Download timeout - file too large or slow connection');
        } else {
            throw new Error(`Download failed: ${error.message}`);
        }
    }
}

module.exports = { downloadFile };
