const fs = require('node:fs/promises');
const path = require('node:path');
const { storageDirectory } = require('../config/storage');

async function findPath(storageName) {
  const filePath = path.resolve(storageDirectory, storageName);

  try {
    await fs.access(filePath);
    return filePath;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function remove(storageName) {
  await fs.unlink(path.resolve(storageDirectory, storageName));
}

module.exports = { findPath, remove };
