const { after, before, test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const storageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_FILE_SIZE_BYTES = '32';
process.env.DEFAULT_OWNER_ID = 'local-user';

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

async function listDocuments() {
  const response = await fetch(`${getBaseUrl()}/documents`);
  assert.strictEqual(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  return response.json();
}

async function uploadFile(content, name) {
  const form = new FormData();
  form.append('file', new Blob([content]), name);
  const response = await fetch(`${getBaseUrl()}/upload`, {
    method: 'POST',
    body: form,
  });
  assert.strictEqual(response.status, 201);
  return response.json();
}

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('lista vazia retorna um array JSON vazio', async () => {
  assert.deepStrictEqual(await listDocuments(), []);
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
  assert.deepStrictEqual(Object.keys(uploadedDocument).sort(), [
    'id', 'originalName', 'owner', 'size', 'uploadedAt',
  ]);
  assert.match(uploadedDocument.id, /^[0-9a-f-]{36}$/);
  assert.strictEqual(new Date(uploadedDocument.uploadedAt).toISOString(), uploadedDocument.uploadedAt);
  const storedFiles = fs.readdirSync(storageDirectory);
  assert.strictEqual(storedFiles.length, 1);
  assert.notStrictEqual(storedFiles[0], 'teste.txt');
  assert.strictEqual(
    fs.readFileSync(path.join(storageDirectory, storedFiles[0]), 'utf8'),
    'conteudo de teste',
  );

  const listResponse = await fetch(`${getBaseUrl()}/documents`);
  assert.strictEqual(listResponse.status, 200);
  assert.deepStrictEqual(await listResponse.json(), [uploadedDocument]);

  const downloadResponse = await fetch(
    `${getBaseUrl()}/documents/${uploadedDocument.id}/download`,
  );
  assert.strictEqual(downloadResponse.status, 200);
  assert.match(
    downloadResponse.headers.get('content-disposition'),
    /^attachment; filename="teste\.txt"$/,
  );
  assert.strictEqual(downloadResponse.headers.get('content-length'), '17');
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

test('aceita arquivo abaixo do limite e baixa os mesmos bytes binários', async () => {
  const content = Uint8Array.from({ length: 31 }, (_, index) => index * 8);
  const uploadedDocument = await uploadFile(content, 'binario.dat');
  assert.strictEqual(uploadedDocument.size, content.byteLength);

  const response = await fetch(
    `${getBaseUrl()}/documents/${uploadedDocument.id}/download`,
  );
  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(new Uint8Array(await response.arrayBuffer()), content);
});

test('lista todos os metadados públicos na ordem definida pelo contrato', async () => {
  const before = await listDocuments();
  const first = await uploadFile('primeiro', 'primeiro.txt');
  const second = await uploadFile('segundo', 'segundo.txt');
  const expected = [...before, first, second].sort((left, right) => (
    right.uploadedAt.localeCompare(left.uploadedAt) || left.id.localeCompare(right.id)
  ));
  const documents = await listDocuments();

  assert.deepStrictEqual(documents, expected);
  for (const document of documents) {
    assert.deepStrictEqual(Object.keys(document).sort(), [
      'id', 'originalName', 'owner', 'size', 'uploadedAt',
    ]);
  }
});

for (const invalidCase of [
  { name: 'campo de arquivo incorreto', fields: ['document'] },
  { name: 'mais de um arquivo', fields: ['file', 'file'] },
]) {
  test(`rejeita ${invalidCase.name} sem deixar arquivos ou metadados`, async () => {
    const documentsBefore = await listDocuments();
    const filesBefore = fs.readdirSync(storageDirectory).sort();
    const form = new FormData();
    for (const field of invalidCase.fields) {
      form.append(field, new Blob(['conteudo']), 'teste.txt');
    }

    const response = await fetch(`${getBaseUrl()}/upload`, {
      method: 'POST',
      body: form,
    });
    assert.strictEqual(response.status, 400);
    assert.deepStrictEqual(await response.json(), {
      error: { code: 'INVALID_UPLOAD', message: 'Envie somente um arquivo no campo file.' },
    });
    assert.deepStrictEqual(await listDocuments(), documentsBefore);
    assert.deepStrictEqual(fs.readdirSync(storageDirectory).sort(), filesBefore);
  });
}

test('retorna 404 JSON quando o arquivo registrado foi removido do disco', async () => {
  const filesBefore = new Set(fs.readdirSync(storageDirectory));
  const document = await uploadFile('remover', 'removido.txt');
  const createdFiles = fs.readdirSync(storageDirectory).filter((name) => !filesBefore.has(name));
  assert.strictEqual(createdFiles.length, 1);
  fs.unlinkSync(path.join(storageDirectory, createdFiles[0]));

  const response = await fetch(`${getBaseUrl()}/documents/${document.id}/download`);
  assert.strictEqual(response.status, 404);
  assert.deepStrictEqual(await response.json(), {
    error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
  });
});
