const documentService = require('../services/documentService');

function getOwner(req) {
  const ownerId = req.user?.id || process.env.DEFAULT_OWNER_ID || 'local-user';
  return String(ownerId);
}

async function upload(req, res) {
  const document = await documentService.create(req.file, getOwner(req));
  res.status(201).json(document);
}

async function list(req, res) {
  const documents = await documentService.list(getOwner(req));
  res.json(documents);
}

async function download(req, res, next) {
  const document = await documentService.getForDownload(req.params.id, getOwner(req));

  res.download(document.filePath, document.originalName, (error) => {
    if (error) {
      next(error);
    }
  });
}

module.exports = { upload, list, download };