# WhatsApp Decryptor v2.0 - Supreme Edition

Serviço ultra-otimizado para descriptografar arquivos do WhatsApp via n8n.

## 🚀 Quick Start

### 1. Clone e Configure
```bash
git clone <repo>
cd whatsapp-decryptor
```

### 2. Deploy com Docker
```bash
docker-compose up -d
```

### 3. Ou Deploy Manual
```bash
npm install --production
npm start
```

## 📡 Endpoint

**URL:** `https://descrypter-descrypter.y5mjvs.easypanel.host/n8n/decrypt`  
**Method:** POST  
**Content-Type:** application/json

### Request Body:
```json
{
  "fileData": "base64_encrypted_file",
  "mediaKey": "base64_media_key",
  "fileEncSha256": "base64_sha256",
  "mimetype": "application/pdf",
  "fileName": "document.pdf"
}
```

### Response Success:
```json
{
  "success": true,
  "decryptedFile": "base64_decrypted_file",
  "mimetype": "application/pdf",
  "fileName": "document.pdf",
  "fileSize": 245632
}
```

## 🔧 n8n Configuration

No HTTP Request node do n8n:

1. **Method:** POST
2. **URL:** `https://descrypter-descrypter.y5mjvs.easypanel.host/n8n/decrypt`
3. **Body Type:** JSON
4. **JSON Body:**
```javascript
{
  "fileData": "{{ $binary.data.data }}",
  "mediaKey": "{{ $json.mediaKey }}",
  "fileEncSha256": "{{ $json.fileEncSha256 }}",
  "mimetype": "{{ $json.mimetype }}",
  "fileName": "{{ $json.fileName }}"
}
```

## 🏃 Performance

- Suporta arquivos até 200MB
- Processamento em memória otimizado
- Health check automático
- Zero dependências desnecessárias

## 📊 Monitoramento

- Health Check: `GET /health`
- Status: `GET /`

## 🐳 Deploy no EasyPanel

1. Crie novo app
2. Use o Dockerfile fornecido
3. Configure porta 3000
4. Defina o domínio customizado
5. Deploy!

---
**v2.0** - Versão Supreme - Foco em performance e simplicidade
