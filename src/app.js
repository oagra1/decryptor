const express = require('express');
const dotenv = require('dotenv');
const { setupMiddleware } = require('./middleware');
const { decryptWhatsAppFile } = require('./decryptor');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Setup all middleware
setupMiddleware(app);

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'WhatsApp Decryptor v2.0',
        endpoint: '/n8n/decrypt',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// Main decryption endpoint
app.post('/n8n/decrypt', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Decryption request received`);
    
    try {
        const { fileData, mediaKey, fileEncSha256, mimetype, fileName } = req.body;

        // Validate required fields
        if (!fileData || !mediaKey || !fileEncSha256) {
            console.error('[ERROR] Missing required fields');
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: fileData, mediaKey, and fileEncSha256'
            });
        }

        console.log(`[INFO] Processing file: ${fileName || 'unnamed'} (${mimetype || 'unknown type'})`);

        // Decrypt the file
        const result = await decryptWhatsAppFile({
            fileData,
            mediaKey,
            fileEncSha256,
            mimetype,
            fileName
        });

        console.log(`[SUCCESS] File decrypted: ${fileName || 'unnamed'}`);

        // Return decrypted file
        res.json({
            success: true,
            decryptedFile: result.decryptedFile,
            mimetype: result.mimetype,
            fileName: result.fileName,
            fileSize: result.fileSize
        });

    } catch (error) {
        console.error('[ERROR] Decryption failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        availableEndpoints: ['GET /', 'GET /health', 'POST /n8n/decrypt']
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════╗
║   WhatsApp Decryptor v2.0 - RUNNING   ║
╠═══════════════════════════════════════╣
║   Port: ${PORT}                           ║
║   Endpoint: /n8n/decrypt              ║
║   Environment: ${process.env.NODE_ENV || 'production'}           ║
╚═══════════════════════════════════════╝
    `);
});
