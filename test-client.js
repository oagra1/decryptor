const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test client for the decryption service
async function testDecryption() {
    const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
    
    // Example test data (you should replace with real WhatsApp encrypted data)
    const testData = {
        fileData: "base64_encoded_encrypted_file_data_here",
        mediaKey: "base64_encoded_media_key_here",
        fileEncSha256: "base64_encoded_sha256_here",
        mimetype: "application/pdf",
        fileName: "test_document.pdf"
    };

    try {
        console.log('🚀 Testing WhatsApp Decryption Service...\n');
        
        // Test health endpoint
        console.log('📍 Testing health endpoint...');
        const healthResponse = await axios.get(`${serverUrl}/health`);
        console.log('✅ Health check passed:', healthResponse.data.status);
        
        // Test decryption endpoint
        console.log('\n📍 Testing decryption endpoint...');
        const startTime = Date.now();
        
        const decryptResponse = await axios.post(`${serverUrl}/api/decrypt`, testData, {
            headers: {
                'Content-Type': 'application/json'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        
        const endTime = Date.now();
        
        if (decryptResponse.data.success) {
            console.log('✅ Decryption successful!');
            console.log(`⏱️  Processing time: ${endTime - startTime}ms`);
            console.log(`📄 File name: ${decryptResponse.data.data.fileName}`);
            console.log(`📏 File size: ${decryptResponse.data.data.fileSize} bytes`);
            console.log(`🔧 MIME type: ${decryptResponse.data.data.mimetype}`);
            console.log(`🔐 SHA256: ${decryptResponse.data.data.sha256}`);
            
            // Optionally save the decrypted file
            if (process.argv.includes('--save')) {
                const outputPath = path.join(__dirname, 'output', decryptResponse.data.data.fileName);
                const outputDir = path.dirname(outputPath);
                
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }
                
                const fileBuffer = Buffer.from(decryptResponse.data.data.decryptedFile, 'base64');
                fs.writeFileSync(outputPath, fileBuffer);
                console.log(`\n💾 File saved to: ${outputPath}`);
            }
        } else {
            console.error('❌ Decryption failed:', decryptResponse.data.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Instructions for testing with real data
console.log('=====================================');
console.log('WhatsApp Decryption Service Test');
console.log('=====================================\n');
console.log('To test with real data:');
console.log('1. Update the testData object with real encrypted file data');
console.log('2. Run: node test-client.js');
console.log('3. To save the decrypted file: node test-client.js --save\n');
console.log('=====================================\n');

// Run the test
testDecryption();
