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
            
            // Análise de possíveis estruturas
            console.log('\n🔍 ANÁLISE DE ESTRUTURA:');
            console.log(`   Possível IV (primeiros 16 bytes): ${buffer.slice(0, 16).toString('hex')}`);
            console.log(`   Possível MAC (últimos 10 bytes): ${buffer.slice(-10).toString('hex')}`);
            console.log(`   Possível MAC (últimos 16 bytes): ${buffer.slice(-16).toString('hex')}`);
            console.log(`   Possível MAC (últimos 32 bytes): ${buffer.slice(-32).toString('hex')}`);
            
            // Verificar se é base64
            const isBase64 = this.isBase64(buffer.toString());
            console.log(`   É Base64?: ${isBase64}`);
            
            if (isBase64) {
                console.log('   🔄 Tentando decodificar de base64...');
                try {
                    const decoded = Buffer.from(buffer.toString(), 'base64');
                    console.log(`   📏 Tamanho decodificado: ${decoded.length} bytes`);
                    console.log(`   🔍 Primeiros 32 bytes decodificados: ${decoded.slice(0, 32).toString('hex')}`);
                } catch (error) {
                    console.log(`   ❌ Erro ao decodificar base64: ${error.message}`);
                }
            }
            
        } catch (error) {
            console.log(`❌ Erro na análise: ${error.message}`);
        }
    }

    // Verificar se uma string é base64 válida
    isBase64(str) {
        try {
            return Buffer.from(str, 'base64').toString('base64') === str;
        } catch (err) {
            return false;
        }
    }

    // Teste 5: Testar diferentes formatos de MediaKey
    async testDifferentKeyFormats(filePath, mediaKey) {
        console.log('\n🧪 TESTE 5: Testando diferentes formatos de MediaKey');
        console.log('═'.repeat(50));
        
        const keyVariations = [
            { name: 'Original', key: mediaKey },
            { name: 'URL Safe Base64', key: mediaKey.replace(/\+/g, '-').replace(/\//g, '_') },
            { name: 'Sem padding', key: mediaKey.replace(/=+$/, '') },
            { name: 'Com padding extra', key: mediaKey + '=' },
            { name: 'Hex para Base64', key: this.hexToBase64IfPossible(mediaKey) }
        ];
        
        for (const variation of keyVariations) {
            console.log(`\n🔑 Testando: ${variation.name}`);
            console.log(`   Key: ${variation.key.substring(0, 40)}...`);
            
            try {
                // Verificar se é base64 válido
                const keyBuffer = Buffer.from(variation.key, 'base64');
                console.log(`   ✅ Base64 válido - Tamanho: ${keyBuffer.length} bytes`);
                
                // Tentar descriptografar
                const success = await this.testLocalDecryption(filePath, variation.key);
                if (success) {
                    console.log(`   🎉 SUCESSO COM ${variation.name}!`);
                    return variation.key;
                }
                
            } catch (error) {
                console.log(`   ❌ Falhou: ${error.message}`);
            }
        }
        
        return null;
    }

    hexToBase64IfPossible(str) {
        try {
            // Se parecer hex (apenas caracteres 0-9, a-f)
            if (/^[0-9a-fA-F]+$/.test(str) && str.length % 2 === 0) {
                const buffer = Buffer.from(str, 'hex');
                return buffer.toString('base64');
            }
            return str;
        } catch {
            return str;
        }
    }

    // Teste 6: Health check da API
    async testApiHealth() {
        console.log('\n🧪 TESTE 6: Health check da API');
        console.log('═'.repeat(50));
        
        try {
            const response = await axios.get(`${this.serverUrl}/health`, { timeout: 5000 });
            console.log(`✅ API está funcionando`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Data:`, response.data);
            return true;
        } catch (error) {
            console.log(`❌ API não está respondendo: ${error.message}`);
            return false;
        }
    }

    // Executar todos os testes
    async runAllTests(filePath, mediaKey, mediaType = 'document') {
        console.log('🚀 INICIANDO BATERIA COMPLETA DE TESTES');
        console.log('═'.repeat(60));
        
        // Verificar se a API está funcionando
        const apiWorking = await this.testApiHealth();
        
        // Análise do arquivo
        this.analyzeFile(filePath);
        
        // Testar formatos de chave
        const workingKey = await this.testDifferentKeyFormats(filePath, mediaKey);
        
        if (workingKey) {
            console.log(`\n🎯 Chave funcionando encontrada: ${workingKey.substring(0, 30)}...`);
            
            if (apiWorking) {
                // Testar APIs com a chave que funciona
                await this.testApiDecrypt(filePath, workingKey, mediaType);
                await this.testApiBuffer(filePath, workingKey, mediaType);
            }
        } else {
            console.log(`\n❌ Nenhum formato de chave funcionou localmente`);
            
            if (apiWorking) {
                console.log(`\n🔄 Testando API mesmo assim...`);
                await this.testApiDecrypt(filePath, mediaKey, mediaType);
                await this.testApiBuffer(filePath, mediaKey, mediaType);
            }
        }
        
        console.log('\n🏁 TESTES CONCLUÍDOS');
        console.log('═'.repeat(60));
    }

    // Teste específico para debug do problema atual
    async debugCurrentIssue(filePath, mediaKey) {
        console.log('🐛 DEBUG ESPECÍFICO PARA SEU PROBLEMA');
        console.log('═'.repeat(60));
        
        console.log('📋 Informações fornecidas:');
        console.log(`   Arquivo: ${filePath}`);
        console.log(`   MediaKey: ${mediaKey.substring(0, 30)}...`);
        console.log(`   Erro API 1: "Falha na verificação do MAC"`);
        console.log(`   Erro API 2: "encryptedData e mediaKey são obrigatórios"`);
        
        // Verificar arquivo
        if (!fs.existsSync(filePath)) {
            console.log('❌ PROBLEMA: Arquivo não encontrado para teste');
            console.log('💡 SOLUÇÃO: Forneça o caminho correto do arquivo');
            return;
        }
        
        // Análise detalhada
        console.log('\n🔍 PASSO 1: Análise do arquivo');
        this.analyzeFile(filePath);
        
        // Teste local com debug máximo
        console.log('\n🔍 PASSO 2: Teste local com debug');
        this.decrypter.setDebug(true);
        
        try {
            const fileBuffer = fs.readFileSync(filePath);
            
            // Testar diferentes abordagens
            console.log('\n🔬 PASSO 3: Testando múltiplas abordagens...');
            
            const approaches = [
                { name: 'Document', type: 'document' },
                { name: 'Image', type: 'image' },
                { name: 'Video', type: 'video' },
                { name: 'Audio', type: 'audio' }
            ];
            
            for (const approach of approaches) {
                console.log(`\n🧪 Testando como ${approach.name}:`);
                try {
                    const result = this.decrypter.decryptBuffer(fileBuffer, mediaKey, approach.type);
                    console.log(`   ✅ SUCESSO! Tamanho: ${result.length} bytes`);
                    
                    const outputFile = `debug_${approach.type}_${Date.now()}.bin`;
                    fs.writeFileSync(outputFile, result);
                    console.log(`   📁 Salvo em: ${outputFile}`);
                    
                    const detectedType = this.decrypter.detectFileType(result);
                    console.log(`   🎯 Tipo detectado: ${detectedType}`);
                    
                    return; // Parar no primeiro sucesso
                    
                } catch (error) {
                    console.log(`   ❌ Falhou: ${error.message}`);
                }
            }
            
        } catch (error) {
            console.log(`❌ Erro geral: ${error.message}`);
        }
        
        console.log('\n💡 PRÓXIMOS PASSOS RECOMENDADOS:');
        console.log('1. Verificar se a mediaKey está completa e correta');
        console.log('2. Confirmar que o arquivo é realmente do WhatsApp');
        console.log('3. Testar com um arquivo diferente');
        console.log('4. Verificar se há algum processamento adicional necessário');
    }
}

// Exemplo de uso
async function exemplo() {
    console.log('📝 EXEMPLO DE USO DO DEBUG:');
    console.log('═'.repeat(50));
    console.log();
    console.log('const debugger = new DebugTester("http://sua-vps:3000");');
    console.log('');
    console.log('// Para debug completo:');
    console.log('await debugger.runAllTests(');
    console.log('    "/caminho/para/arquivo.enc",');
    console.log('    "sua_media_key_base64"');
    console.log(');');
    console.log('');
    console.log('// Para debug específico do seu problema:');
    console.log('await debugger.debugCurrentIssue(');
    console.log('    "/caminho/para/arquivo.enc",');
    console.log('    "sua_media_key_base64"');
    console.log(');');
    console.log('');
    console.log('🔧 COMO USAR:');
    console.log('1. Salve este arquivo como debug.js');
    console.log('2. npm install axios form-data');
    console.log('3. node debug.js');
    console.log('4. Ou importe e use as funções específicas');
}

// Executar exemplo se chamado diretamente
if (require.main === module) {
    exemplo();
}

module.exports = DebugTester;
