const fs = require('node:fs/promises');
const path = require('node:path');

const storageDirectory = path.resolve(
  process.env.STORAGE_DIR || path.join(__dirname, '../../storage'),
);

function resolveStoragePath(storageName) {
  if (
    typeof storageName !== 'string'
    || !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(storageName)
  ) {
    throw new Error('Nome de armazenamento inválido.');
  }

  return path.join(storageDirectory, path.basename(storageName));
}

async function findPath(storageName) {
  const filePath = resolveStoragePath(storageName);

  try {
    await fs.access(filePath);
    return filePath;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function remove(storageName) {
  return fs.unlink(resolveStoragePath(storageName));
}

module.exports = { findPath, remove };
