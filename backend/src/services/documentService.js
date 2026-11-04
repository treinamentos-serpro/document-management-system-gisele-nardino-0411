const fs = require('node:fs/promises');
const path = require('node:path');
const documentRepository = require('../repositories/documentRepository');
const AppError = require('./appError');

const storageDirectory = path.resolve(
  process.env.STORAGE_DIR || path.join(__dirname, '../../storage'),
);

async function create(file, owner) {
  if (!file) {
    throw new AppError(400, 'FILE_REQUIRED', 'Envie um arquivo para continuar.');
  }

  try {
    return documentRepository.create({
      originalName: file.originalname,
      size: file.size,
      owner,
      storageName: file.filename,
    });
  } catch (error) {
    await fs.unlink(file.path).catch(() => {});
    throw error;
  }
}

async function list(owner) {
  return documentRepository.findByOwner(owner);
}

async function getForDownload(id, owner) {
  const document = documentRepository.findById(id);

  if (!document || document.owner !== owner) {
    throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  const filePath = path.resolve(storageDirectory, document.storageName);

  try {
    await fs.access(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
    }
    throw error;
  }

  return { filePath, originalName: document.originalName };
}

module.exports = { create, list, getForDownload };