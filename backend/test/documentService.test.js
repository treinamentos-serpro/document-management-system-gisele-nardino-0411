const { test } = require('node:test');
const assert = require('node:assert/strict');
const documentService = require('../src/services/documentService');
const documentRepository = require('../src/repositories/documentRepository');
const fileRepository = require('../src/repositories/fileRepository');

const file = { originalName: 'teste.txt', size: 5, storageName: 'arquivo-interno' };
const owner = 'usuario-teste';

test('registra os metadados sem depender do objeto Multer', async (t) => {
  const document = { id: 'documento', ...file, owner };
  const create = t.mock.method(documentRepository, 'create', () => document);

  assert.equal(await documentService.create(file, owner), document);
  assert.deepEqual(create.mock.calls[0].arguments, [{ ...file, owner }]);
});

test('rejeita arquivo ausente sem acessar os repositórios', async (t) => {
  const create = t.mock.method(documentRepository, 'create');
  const remove = t.mock.method(fileRepository, 'remove', async () => {});

  await assert.rejects(documentService.create(undefined, owner), {
    status: 400,
    code: 'FILE_REQUIRED',
  });
  assert.equal(create.mock.callCount(), 0);
  assert.equal(remove.mock.callCount(), 0);
});

test('remove o arquivo se o registro dos metadados falhar', async (t) => {
  const failure = new Error('Falha ao registrar');
  t.mock.method(documentRepository, 'create', () => { throw failure; });
  const remove = t.mock.method(fileRepository, 'remove', async () => {});

  await assert.rejects(documentService.create(file, owner), (error) => error === failure);
  assert.deepEqual(remove.mock.calls[0].arguments, [file.storageName]);
});

test('registra falha de limpeza sem mascarar o erro original', async (t) => {
  const failure = new Error('Falha ao registrar');
  const cleanupFailure = new Error('Falha ao remover');
  t.mock.method(documentRepository, 'create', () => { throw failure; });
  t.mock.method(fileRepository, 'remove', async () => { throw cleanupFailure; });
  const log = t.mock.method(console, 'error', () => {});

  await assert.rejects(documentService.create(file, owner), (error) => error === failure);
  assert.equal(log.mock.callCount(), 1);
  assert.equal(log.mock.calls[0].arguments[1], cleanupFailure);
});

test('lista os documentos apenas pelo proprietário informado', async (t) => {
  const documents = [{ id: 'documento', owner }];
  const find = t.mock.method(documentRepository, 'findByOwner', () => documents);

  assert.equal(await documentService.list(owner), documents);
  assert.deepEqual(find.mock.calls[0].arguments, [owner]);
});

test('autoriza o download antes de consultar o arquivo', async (t) => {
  t.mock.method(documentRepository, 'findById', () => ({ ...file, owner }));
  const findPath = t.mock.method(fileRepository, 'findPath', async () => '/storage/arquivo');

  assert.deepEqual(await documentService.getForDownload('documento', owner), {
    filePath: '/storage/arquivo',
    originalName: file.originalName,
  });
  assert.deepEqual(findPath.mock.calls[0].arguments, [file.storageName]);
});

test('nega documento alheio ou inexistente sem acessar o filesystem', async (t) => {
  t.mock.method(documentRepository, 'findById', (id) => (
    id === 'alheio' ? { ...file, owner: 'outro-usuario' } : null
  ));
  const findPath = t.mock.method(fileRepository, 'findPath', async () => '/storage/arquivo');

  for (const id of ['alheio', 'ausente']) {
    await assert.rejects(documentService.getForDownload(id, owner), {
      status: 404,
      code: 'DOCUMENT_NOT_FOUND',
    });
  }
  assert.equal(findPath.mock.callCount(), 0);
});

test('retorna 404 quando o arquivo não existe mais no storage', async (t) => {
  t.mock.method(documentRepository, 'findById', () => ({ ...file, owner }));
  t.mock.method(fileRepository, 'findPath', async () => null);

  await assert.rejects(documentService.getForDownload('documento', owner), {
    status: 404,
    code: 'DOCUMENT_NOT_FOUND',
  });
});

test('propaga falhas inesperadas de leitura do storage', async (t) => {
  const failure = new Error('Falha de leitura');
  t.mock.method(documentRepository, 'findById', () => ({ ...file, owner }));
  t.mock.method(fileRepository, 'findPath', async () => { throw failure; });

  await assert.rejects(
    documentService.getForDownload('documento', owner),
    (error) => error === failure,
  );
});
