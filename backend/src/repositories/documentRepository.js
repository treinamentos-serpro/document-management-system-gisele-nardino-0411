const { randomUUID } = require('node:crypto');

const documents = new Map();

function toPublicDocument(document) {
  const { storageName: _storageName, ...publicDocument } = document;
  return publicDocument;
}

function create({ originalName, size, owner, storageName }) {
  const document = {
    id: randomUUID(),
    originalName,
    size,
    uploadedAt: new Date().toISOString(),
    owner,
    storageName,
  };

  documents.set(document.id, document);
  return toPublicDocument(document);
}

function findByOwner(owner) {
  return [...documents.values()]
    .filter((document) => document.owner === owner)
    .sort((left, right) => {
      const byDate = right.uploadedAt.localeCompare(left.uploadedAt);
      return byDate || left.id.localeCompare(right.id);
    })
    .map(toPublicDocument);
}

function findById(id) {
  return documents.get(id) || null;
}

module.exports = { create, findByOwner, findById };