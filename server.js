const express = require('express');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());

const upload = multer({ dest: 'uploads/' });

// Função HKDF para derivar chave e IV
function hkdf(key, length, info) {
  let keyBlock = Buffer.alloc(0);
  let outputBlock = Buffer.alloc(0);
  let blockIndex = 1;
  while (outputBlock.length < length) {
    let input = Buffer.concat([
      keyBlock,
      Buffer.from(info, 'utf-8'),
      Buffer.from([blockIndex]),
    ]);
    keyBlock = crypto.createHmac('sha256', key).update(input).digest();
    outputBlock = Buffer.concat([outputBlock, keyBlock]);
    blockIndex++;
  }
  return outputBlock.slice(0, length);
}

// Função para descriptografar o arquivo .enc do WhatsApp
function decryptMedia(buffer, mediaKeyBase64, mediaType) {
  const mediaKey = Buffer.from(mediaKeyBase64, 'base64');
  const infoMap = {
    document: 'WhatsApp Document Keys',
  };
  const info = infoMap[mediaType];
  const expandedKey = hkdf(mediaKey, 112, info);
  const iv = expandedKey.slice(0, 16);
  const cipherKey = expandedKey.slice(16, 48);

  // Remove os últimos 10 bytes (MAC)
  const file = buffer.slice(0, buffer.length - 10);

  const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
  decipher.setAutoPadding(true);

  const decrypted = Buffer.concat([decipher.update(file), decipher.final()]);
  return decrypted;
}

app.post('/decrypt', upload.single('file'), async (req, res) => {
  try {
    if (!req.body.mediaKey) {
      return res.status(400).json({ error: 'mediaKey is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'file is required' });
    }

    // Lê o arquivo binário enviado
    const encryptedData = fs.readFileSync(req.file.path);

    // Descriptografa o arquivo
    const decrypted = decryptMedia(encryptedData, req.body.mediaKey, 'document');

    // Define nome e tipo do arquivo de saída
    let fileName = req.file.originalname.replace('.enc', '') || 'decrypted.pdf';
    let contentType = 'application/pdf';
    if (fileName.toLowerCase().endsWith('.docx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    // Envia o arquivo descriptografado como resposta
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', contentType);
    res.send(decrypted);
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    // Remove o arquivo temporário
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
  }
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`WhatsApp Decrypt API rodando na porta ${PORT}`);
});
