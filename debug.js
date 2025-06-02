const WhatsAppDecrypter = require('./decrypt');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class DebugTester {
    constructor(serverUrl = 'http://localhost:3000') {
        this.serverUrl = serverUrl;
        this.decrypter = new WhatsAppDecrypter();
    }

    // Teste 1: Debug local do decrypter
    async testLocalDecryption(filePath, mediaKey, mediaType = 'document') {
        console.log('🧪 TESTE 1: Descriptografia local com debug');
        console.log('═'.repeat(50));
        
        try {
            // Ativar debug detalhado
            this.decrypter.setDebug(true);
            
            // Ler arquivo
            if (!fs.existsSync(filePath)) {
                console.log('❌ Arquivo não encontrado:', filePath);
                return false;
            }
            
            const fileBuffer = fs.readFileSync(filePath);
            console.log(`📁 Arquivo lido: ${filePath}`);
            console.log(`📏 Tamanho: ${fileBuffer.length} bytes`);
            console.log(`🔑 MediaKey: ${mediaKey.substring(0, 30)}...`);
            
            // Análise inicial do arquivo
            console.log('\n🔍 ANÁLISE DO ARQUIVO:');
            console.log(`   Primeiros 32 bytes: ${fileBuffer.slice(0, 32).toString('hex')}`);
            console.log(`   Últimos 32 bytes: ${fileBuffer.slice(-32).toString('hex')}`);
            
            // Tentar descriptografar
            const result = this.decrypter.decryptBuffer(fileBuffer, mediaKey, mediaType);
            
            // Salvar resultado
            const outputFile = `debug_decrypted_${Date.now()}.bin`;
            fs.writeFileSync(outputFile, result);
            
            // Detectar tipo
            const detectedType = this.decrypter.detectFileType(result);
            const finalFile = `debug_decrypted_${Date.now()}.${detectedType}`;
            fs.writeFileSync(finalFile, result);
            
            console.log(`\n✅ SUCESSO!`);
            console.log(`   📁 Arquivo salvo: ${finalFile}`);
            console.log(`   📏 Tamanho final: ${result.length} bytes`);
            console.log(`   🎯 Tipo detectado: ${detectedType}`);
            
            return true;
            
        } catch (error) {
            console.log(`\n❌ ERRO:`, error.message);
            console.log(`   Stack:`, error.stack);
            return false;
        }
    }

    // Teste 2: Debug da API /decrypt
    async testApiDecrypt(filePath, mediaKey, mediaType = 'document') {
        console.log('\n🧪 TESTE 2: API /decrypt com debug');
        console.log('═'.repeat(50));
        
        try {
            if (!fs.existsSync(filePath)) {
                console.log('❌ Arquivo não encontrado:', filePath);
                return false;
            }
            
            const form = new FormData();
            form.append('file', fs.createReadStream(filePath));
            form.append('mediaKey', mediaKey);
            form.append('mediaType', mediaType);
            
            console.log(`📡 Enviando para: ${this.serverUrl}/decrypt`);
            console.log(`📁 Arquivo: ${filePath}`);
            console.log(`🔑 MediaKey: ${mediaKey.substring(0, 30)}...`);
            
            const response = await axios.post(`${this.serverUrl}/decrypt`, form, {
                headers: {
                    ...form.getHeaders(),
                },
                responseType: 'arraybuffer',
                timeout: 30000
            });
            
            console.log(`✅ Resposta recebida:`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Tamanho: ${response.data.length} bytes`);
            console.log(`   Headers:`, response.headers);
            
            // Salvar resposta
            const outputFile = `api_decrypted_${Date.now()}.bin`;
            fs.writeFileSync(outputFile, response.data);
            console.log(`   📁 Salvo em: ${outputFile}`);
            
            return true;
            
        } catch (error) {
            console.log(`❌ ERRO na API:`, error.message);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Data:`, error.response.data.toString());
            }
            return false;
        }
    }

    // Teste 3: Debug da API /decrypt/buffer
    async testApiBuffer(filePath, mediaKey, mediaType = 'document') {
        console.log('\n🧪 TESTE 3: API /decrypt/buffer com debug');
        console.log('═'.repeat(50));
        
        try {
            if (!fs.existsSync(filePath)) {
                console.log('❌ Arquivo não encontrado:', filePath);
                return false;
            }
            
            // Ler arquivo e converter para base64
            const fileBuffer = fs.readFileSync(filePath);
            const encryptedData = fileBuffer.toString('base64');
            
            console.log(`📡 Enviando para: ${this.serverUrl}/decrypt/buffer`);
            console.log(`📁 Arquivo: ${filePath}`);
            console.log(`📏 Tamanho original: ${fileBuffer.length} bytes`);
            console.log(`📏 Tamanho base64: ${encryptedData.length} chars`);
            console.log(`🔑 MediaKey: ${mediaKey.substring(0, 30)}...`);
            
            const payload = {
                encryptedData: encryptedData,
                mediaKey: mediaKey,
                mediaType: mediaType,
                returnBase64: false
            };
            
            console.log('\n📦 Payload sendo enviado:');
            console.log(`   encryptedData: ${encryptedData.substring(0, 100)}... (${encryptedData.length} chars)`);
            console.log(`   mediaKey: ${mediaKey.substring(0, 30)}...`);
            console.log(`   mediaType: ${mediaType}`);
            
            const response = await axios.post(`${this.serverUrl}/decrypt/buffer`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                },
                responseType: 'arraybuffer',
                timeout: 30000
            });
            
            console.log(`\n✅ Resposta recebida:`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Tamanho: ${response.data.length} bytes`);
            console.log(`   Headers:`, response.headers);
            
            // Salvar resposta
            const outputFile = `buffer_decrypted_${Date.now()}.bin`;
            fs.writeFileSync(outputFile, response.data);
            console.log(`   📁 Salvo em: ${outputFile}`);
            
            return true;
            
        } catch (error) {
            console.log(`❌ ERRO na API Buffer:`, error.message);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Data:`, error.response.data.toString());
            }
            return false;
        }
    }

    // Teste 4: Análise detalhada do arquivo
    analyzeFile(filePath) {
        console.log('\n🧪 TESTE 4: Análise detalhada do arquivo');
        console.log('═'.repeat(50));
        
        try {
            if (!fs.existsSync(filePath)) {
                console.log('❌ Arquivo não encontrado:', filePath);
                return;
            }
            
            const buffer = fs.readFileSync(filePath);
            
            console.log(`📁 Arquivo: ${filePath}`);
            console.log(`📏 Tamanho total: ${buffer.length} bytes`);
            console.log(`📏 Tamanho em KB: ${(buffer.length / 1024).toFixed(2)} KB`);
            
            // Análise dos primeiros bytes
            console.log('\n🔍 PRIMEIROS 64 BYTES:');
            for (let i = 0; i < Math.min(64, buffer.length); i += 16) {
                const chunk = buffer.slice(i, i + 16);
                const hex = chunk.toString('hex').match(/.{2}/g).join(' ');
                const ascii = chunk.toString('ascii').replace(/[^\x20-\x7E]/g, '.');
                console.log(`   ${i.toString(16).padStart(4, '0')}: ${hex.padEnd(47)} | ${ascii}`);
            }
            
            // Análise dos últimos bytes
            console.log('\n🔍 ÚLTIMOS 64 BYTES:');
            const start = Math.max(0, buffer.length - 64);
            for (let i = start; i < buffer.length; i += 16) {
                const chunk = buffer.slice(i, Math.min(i + 16, buffer.length));
                const hex = chunk.toString('hex').match(/.{2}/g).join(' ');
                const ascii = chunk.toString('ascii').replace(/[^\x20-\x7E]/g, '.');
                console.log(`   ${i.toString(16).padStart(4, '0')}: ${hex.padEnd(47)} | ${ascii}`);
            }
