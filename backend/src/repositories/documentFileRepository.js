const fs = require('node:fs/promises');
const path = require('node:path');

const storageDirectory = path.resolve(
  process.env.STORAGE_DIR || path.join(__dirname, '../../storage'),
);

async function findPath(storageName) {
  const filePath = path.resolve(storageDirectory, storageName);

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

function remove(filePath) {
  return fs.unlink(filePath);
}

module.exports = { findPath, remove };
