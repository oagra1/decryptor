const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const dotenv = require('dotenv');
const decryptionService = require('./services/decryptionService');
const healthCheck = require('./routes/healthCheck');

// Load environment variables
dotenv.config();

// Configure logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: 'logs/combined.log' 
        })
    ]
});

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['POST', 'GET'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parser middleware - increase limit for large files
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '100mb' }));

// Request logging middleware
app.use((req, res, next) => {
    logger.info({
        method: req.method,
        url: req.url,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });
    next();
});

// Routes
app.use('/health', healthCheck);

// Main decryption endpoint
app.post('/api/decrypt', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { 
            fileData, 
            mediaKey, 
            fileEncSha256, 
            mimetype, 
            fileName 
        } = req.body;

        // Validate required fields
        if (!fileData || !mediaKey || !fileEncSha256) {
            logger.warn('Missing required fields in request');
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: fileData, mediaKey, and fileEncSha256 are required'
            });
        }

        logger.info(`Starting decryption for file: ${fileName || 'unnamed'}`);

        // Decrypt the file
        const result = await decryptionService.decryptWhatsAppMedia({
            fileData,
            mediaKey,
            fileEncSha256,
            mimetype,
            fileName
        });

        const processingTime = Date.now() - startTime;
        
        logger.info(`Decryption successful for ${fileName || 'unnamed'} in ${processingTime}ms`);

        // Return decrypted file
        res.json({
            success: true,
            data: {
                decryptedFile: result.decryptedData,
                mimetype: result.mimetype,
                fileName: result.fileName,
                fileSize: result.fileSize,
                sha256: result.sha256,
                processingTime: processingTime
            }
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        logger.error('Decryption error:', {
            error: error.message,
            stack: error.stack,
            processingTime
        });

        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
            processingTime: processingTime
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack
    });

    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    logger.info(`WhatsApp Decryption Service running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Max file size: 100MB`);
});
