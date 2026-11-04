const { after, before, test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const storageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_FILE_SIZE_BYTES = '32';

const app = require('../src/app');
let server;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  fs.rmSync(storageDirectory, { recursive: true, force: true });
});

function getBaseUrl() {
  return `http://127.0.0.1:${server.address().port}`;
}

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('faz upload, lista e baixa um documento', async () => {
  const form = new FormData();
  form.append('file', new Blob(['conteudo de teste']), 'teste.txt');

  const uploadResponse = await fetch(`${getBaseUrl()}/upload`, {
    method: 'POST',
    body: form,
  });

  assert.strictEqual(uploadResponse.status, 201);
  const uploadedDocument = await uploadResponse.json();
  assert.strictEqual(uploadedDocument.originalName, 'teste.txt');
  assert.strictEqual(uploadedDocument.size, 17);
  assert.strictEqual(uploadedDocument.owner, 'local-user');

  const listResponse = await fetch(`${getBaseUrl()}/documents`);
  assert.strictEqual(listResponse.status, 200);
  assert.deepStrictEqual(await listResponse.json(), [uploadedDocument]);

  const downloadResponse = await fetch(
    `${getBaseUrl()}/documents/${uploadedDocument.id}/download`,
  );
  assert.strictEqual(downloadResponse.status, 200);
  assert.strictEqual(await downloadResponse.text(), 'conteudo de teste');
});

test('retorna erro para upload sem arquivo', async () => {
  const documentsBefore = await fetch(`${getBaseUrl()}/documents`).then((response) => response.json());
  const response = await fetch(`${getBaseUrl()}/upload`, { method: 'POST' });

  assert.strictEqual(response.status, 400);
  assert.deepStrictEqual(await response.json(), {
    error: { code: 'FILE_REQUIRED', message: 'Envie um arquivo para continuar.' },
  });
  assert.deepStrictEqual(
    await fetch(`${getBaseUrl()}/documents`).then((listResponse) => listResponse.json()),
    documentsBefore,
  );
});

test('rejeita arquivo acima do limite sem salvar metadados ou arquivo parcial', async () => {
  const documentsBefore = await fetch(`${getBaseUrl()}/documents`).then((response) => response.json());
  const filesBefore = fs.readdirSync(storageDirectory);
  const form = new FormData();
  form.append('file', new Blob(['a'.repeat(33)]), 'grande.txt');

  const response = await fetch(`${getBaseUrl()}/upload`, {
    method: 'POST',
    body: form,
  });

  assert.strictEqual(response.status, 413);
  assert.deepStrictEqual(await response.json(), {
    error: { code: 'FILE_TOO_LARGE', message: 'O arquivo excede o limite permitido.' },
  });
  assert.deepStrictEqual(
    await fetch(`${getBaseUrl()}/documents`).then((listResponse) => listResponse.json()),
    documentsBefore,
  );
  assert.deepStrictEqual(fs.readdirSync(storageDirectory), filesBefore);
});

test('retorna 404 para documento inexistente', async () => {
  const response = await fetch(
    `${getBaseUrl()}/documents/id-inexistente/download`,
  );

  assert.strictEqual(response.status, 404);
  assert.deepStrictEqual(await response.json(), {
    error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
  });
});
