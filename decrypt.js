const crypto = require('crypto');

function hkdf(key, length, appInfo = "") {
  let hashLen = 32;
  let keyBlock = Buffer.alloc(0);
  let outputBlock = Buffer.alloc(0);
  let blockIndex = 1;
  while (outputBlock.length < length) {
    let input = Buffer.concat([
      keyBlock,
      Buffer.from(appInfo, "utf-8"),
      Buffer.from([blockIndex])
    ]);
    keyBlock = crypto.createHmac("sha256", key).update(input).digest();
    outputBlock = Buffer.concat([outputBlock, keyBlock]);
    blockIndex += 1;
  }
  return outputBlock.slice(0, length);
}

function decryptMedia(buffer, mediaKeyBase64, mediaType) {
  const mediaKey = Buffer.from(mediaKeyBase64, 'base64');
  const info = {
    'document': 'WhatsApp Document Keys'
  };

  const expandedKey = hkdf(mediaKey, 112, info[mediaType]);
  const iv = expandedKey.slice(0, 16);
  const cipherKey = expandedKey.slice(16, 48);
  const file = buffer.slice(0, buffer.length - 10); // remove MAC

  const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
  decipher.setAutoPadding(false);

  let decrypted = Buffer.concat([decipher.update(file), decipher.final()]);
  return decrypted;
}

module.exports = { decryptMedia };
