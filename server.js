const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { decryptMedia } = require('./decrypt');

const app = express();
app.use(cors());

const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) => {
  res.send('WhatsApp Decrypt API online!');
});

app.post('/decrypt', upload.single('file'), async (req, res) => {
  try {
    // Checagem dos campos obrigatórios
    if (!req.body.mediaKey) {
      return res.status(400).json({ error: 'mediaKey is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'file is required' });
    }

    // Lê o arquivo criptografado
    const encryptedData = fs.readFileSync(req.file.path);

    // Descriptografa
    const decrypted = decryptMedia(encryptedData, req.body.mediaKey, 'document');

    // Define o nome do arquivo de saída
    const fileName = req.file.originalname
      ? req.file.originalname.replace('.enc', '')
      : 'decrypted.pdf';

    // Seta headers de download
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/pdf');

    // Envia o arquivo descriptografado
    res.send(decrypted);
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    // Limpa o arquivo temporário
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
  }
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`WhatsApp Decrypt API rodando na porta ${PORT}`);
});
