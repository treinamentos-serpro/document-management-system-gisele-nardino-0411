const { after, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { mkdtempSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const storageDirectory = mkdtempSync(path.join(os.tmpdir(), 'dms-file-test-'));
process.env.STORAGE_DIR = storageDirectory;
const fileRepository = require('../src/repositories/fileRepository');

after(async () => {
  await fs.rm(storageDirectory, { recursive: true, force: true });
});

test('localiza e remove arquivo dentro do storage configurado', async () => {
  const storageName = 'arquivo-teste';
  const filePath = path.join(storageDirectory, storageName);
  await fs.writeFile(filePath, 'conteudo');

  assert.equal(await fileRepository.findPath(storageName), filePath);
  await fileRepository.remove(storageName);
  await assert.rejects(fs.access(filePath), { code: 'ENOENT' });
});

test('retorna null para arquivo inexistente', async () => {
  assert.equal(await fileRepository.findPath('inexistente'), null);
});

test('não converte erro de permissão em arquivo inexistente', async (t) => {
  const failure = Object.assign(new Error('Sem permissão'), { code: 'EACCES' });
  t.mock.method(fs, 'access', async () => { throw failure; });

  await assert.rejects(fileRepository.findPath('arquivo'), (error) => error === failure);
});

test('propaga falha de remoção para permitir diagnóstico', async (t) => {
  const failure = Object.assign(new Error('Sem permissão'), { code: 'EACCES' });
  t.mock.method(fs, 'unlink', async () => { throw failure; });

  await assert.rejects(fileRepository.remove('arquivo'), (error) => error === failure);
});
