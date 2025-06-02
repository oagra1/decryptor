const express = require('express');
const router = express.Router();
const os = require('os');

// Health check endpoint
router.get('/', (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now(),
        environment: process.env.NODE_ENV || 'development',
        memory: {
            free: os.freemem(),
            total: os.totalmem(),
            usage: process.memoryUsage()
        },
        cpu: {
            loadAverage: os.loadavg(),
            cores: os.cpus().length
        }
    };
    
    res.status(200).json({
        status: 'healthy',
        service: 'WhatsApp Decryption Service',
        ...healthcheck
    });
});

// Simple ping endpoint
router.get('/ping', (req, res) => {
    res.status(200).json({ 
        status: 'pong',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
