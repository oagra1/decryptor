const express = require('express');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const { decryptMedia } = require('./decrypt');

const app = express();
app.use(cors());

const upload = multer({ dest: 'uploads/' });

app.post('/decrypt', upload.single('file'), async (req, res) => {
  try {
    if (!req.body.mediaKey) {
      return res.status(400).json({ error: 'mediaKey is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'file is required' });
    }

    // Lê o arquivo binário corretamente
    const encryptedData = fs.readFileSync(req.file.path);

    // Descriptografa
    const decrypted = decryptMedia(encryptedData, req.body.mediaKey, 'document');

    // Define nome e tipo do arquivo de saída
    let fileName = req.file.originalname.replace('.enc', '') || 'decrypted.pdf';
    let contentType = 'application/pdf';
    if (fileName.endsWith('.docx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', contentType);
    res.send(decrypted);
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
  }
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`WhatsApp Decrypt API rodando na porta ${PORT}`);
});
