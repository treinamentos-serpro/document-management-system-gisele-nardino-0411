const documentRepository = require('../repositories/documentRepository');
const documentFileRepository = require('../repositories/documentFileRepository');
const AppError = require('./appError');

function documentNotFound() {
  return new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
}

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
    await documentFileRepository.remove(file.path).catch(() => {});
    throw error;
  }
}

function list(owner) {
  return documentRepository.findByOwner(owner);
}

async function getForDownload(id, owner) {
  const document = documentRepository.findById(id);

  if (!document || document.owner !== owner) {
    throw documentNotFound();
  }

  const filePath = await documentFileRepository.findPath(document.storageName);
  if (!filePath) {
    throw documentNotFound();
  }

  return { filePath, originalName: document.originalName };
}

module.exports = { create, list, getForDownload };