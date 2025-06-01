const express = require('express');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Garante que a pasta uploads existe
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const app = express();
const upload = multer({ dest: 'uploads/' });

// Health check
app.get('/', (req, res) => {
  res.send('WhatsApp Decrypt API online!');
});

// Endpoint de descriptografia
app.post('/decrypt', upload.single('file'), (req, res) => {
  try {
    if (!req.body.mediaKey) {
      return res.status(400).json({ error: 'mediaKey is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'file is required' });
    }

    const mediaKeyBase64 = req.body.mediaKey;
    const mediaKey = Buffer.from(mediaKeyBase64, 'base64');
    const encryptedData = fs.readFileSync(req.file.path);

    // HKDF
    const info = Buffer.from('WhatsApp Document Keys');
    const salt = Buffer.alloc(0);

    function hkdf(ikm, length, info) {
      const prk = crypto.createHmac('sha256', salt).update(ikm).digest();
      let t = Buffer.alloc(0);
      let okm = Buffer.alloc(0);
      for (let i = 1; okm.length < length; i++) {
        t = crypto.createHmac('sha256', prk)
          .update(Buffer.concat([t, info, Buffer.from([i])]))
          .digest();
        okm = Buffer.concat([okm, t]);
      }
      return okm.slice(0, length);
    }

    const keyMaterial = hkdf(mediaKey, 112, info);
    const iv = keyMaterial.slice(0, 16);
    const cipherKey = keyMaterial.slice(16, 48);

    const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
    let decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    const paddingLength = decrypted[decrypted.length - 1];
    decrypted = decrypted.slice(0, decrypted.length - paddingLength);

    // Limpa arquivo temporário
    fs.unlinkSync(req.file.path);

    // Retorna o arquivo descriptografado
    res.setHeader('Content-Disposition', `attachment; filename=decrypted_${Date.now()}`);
    res.send(decrypted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WhatsApp Decrypt API rodando na porta ${PORT}`);
});
