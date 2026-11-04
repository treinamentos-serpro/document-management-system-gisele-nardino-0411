const documentRepository = require('../repositories/documentRepository');
const fileRepository = require('../repositories/fileRepository');
const AppError = require('./appError');

async function create(file, owner) {
  if (!file) {
    throw new AppError(400, 'FILE_REQUIRED', 'Envie um arquivo para continuar.');
  }

  try {
    return documentRepository.create({
      originalName: file.originalName,
      size: file.size,
      owner,
      storageName: file.storageName,
    });
  } catch (error) {
    try {
      await fileRepository.remove(file.storageName);
    } catch (cleanupError) {
      console.error('Falha ao remover arquivo após erro no registro de metadados.', cleanupError);
    }
    throw error;
  }
}

async function list(owner) {
  return documentRepository.findByOwner(owner);
}

async function getForDownload(id, owner) {
  const document = documentRepository.findById(id);
  const filePath = document && document.owner === owner
    ? await fileRepository.findPath(document.storageName)
    : null;

  if (!filePath) {
    throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  return { filePath, originalName: document.originalName };
}

module.exports = { create, list, getForDownload };