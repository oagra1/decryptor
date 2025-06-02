const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

function setupMiddleware(app) {
    // Security headers
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // CORS - allow all origins for n8n compatibility
    app.use(cors({
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parsing - 200MB limit for large files
    app.use(express.json({ 
        limit: '200mb',
        verify: (req, res, buf) => {
            req.rawBody = buf.toString('utf8');
        }
    }));
    
    app.use(express.urlencoded({ 
        extended: true, 
        limit: '200mb' 
    }));

    // Request logging
    app.use((req, res, next) => {
        const start = Date.now();
        
        res.on('finish', () => {
            const duration = Date.now() - start;
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        });
        
        next();
    });

    // Trust proxy
    app.set('trust proxy', true);
}

module.exports = { setupMiddleware };
