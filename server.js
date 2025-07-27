const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const { PNG } = require("pngjs");

const app = express();
const PORT = 5000;

app.use(cors());
const upload = multer({ dest: "uploads/" });


function encodeMessage(buffer, message) {
  const png = PNG.sync.read(buffer);
  const data = png.data;

  let messageBits = '';
  for (let i = 0; i < message.length; i++) {
    messageBits += message.charCodeAt(i).toString(2).padStart(8, '0');
  }

  messageBits += '00000000'; 

  for (let i = 0; i < messageBits.length; i++) {
    data[i * 4] = (data[i * 4] & 0xFE) | parseInt(messageBits[i]); 
  }

  return PNG.sync.write(png);
}


function decodeMessage(buffer) {
  const png = PNG.sync.read(buffer);
  const data = png.data;

  let bits = '';
  for (let i = 0; i < data.length; i += 4) {
    bits += (data[i] & 1).toString();
  }

  let chars = '';
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.slice(i, i + 8);
    if (byte === '00000000') break;
    chars += String.fromCharCode(parseInt(byte, 2));
  }

  return chars;
}


app.post("/api/encode", upload.single("image"), (req, res) => {
  const image = req.file;
  const message = req.body.message;

  if (!image || !message) {
    return res.status(400).send("Image and message required.");
  }

  const buffer = fs.readFileSync(image.path);
  const encoded = encodeMessage(buffer, message);
  fs.unlinkSync(image.path); 

  res.set("Content-Disposition", "attachment; filename=encoded_image.png");
  res.set("Content-Type", "image/png");
  res.send(encoded);
});


app.post("/api/decode", upload.single("image"), (req, res) => {
  const image = req.file;
  if (!image) return res.status(400).send("Image required.");

  const buffer = fs.readFileSync(image.path);
  const message = decodeMessage(buffer);
  fs.unlinkSync(image.path);

  res.json({ message });
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
