const express = require('express');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const multer = require('multer');
const documentController = require('../controllers/documentController');
const { storageDirectory } = require('../config/storage');

const router = express.Router();
const maxFileSize = Number(process.env.MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024);

if (!Number.isSafeInteger(maxFileSize) || maxFileSize <= 0) {
  throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
}

fs.mkdirSync(storageDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: storageDirectory,
  filename: (_req, _file, callback) => callback(null, randomUUID()),
});

const upload = multer({
  storage,
  limits: { fileSize: maxFileSize, files: 1 },
});

router.post('/upload', upload.single('file'), documentController.upload);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', documentController.download);

module.exports = router;