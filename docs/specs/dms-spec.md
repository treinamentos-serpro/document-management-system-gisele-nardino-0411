# Especificação - Document Management System

## 1. Objetivo

Oferecer uma aplicação web simples para que usuários enviem, consultem e baixem seus documentos, mantendo os arquivos no filesystem local e os metadados em memória.

## 2. Escopo

### Dentro do escopo

- Enviar um documento por requisição.
- Listar os metadados dos documentos pertencentes ao usuário da requisição.
- Baixar um documento pelo identificador, respeitando a propriedade do documento.
- Associar cada documento a um identificador de usuário (`owner`).
- Apresentar no frontend os fluxos de envio, listagem e download, com estados de carregamento, vazio e erro.
- Armazenar arquivos localmente com Multer `diskStorage` e manter os metadados em memória.

### Fora do escopo

- Armazenamento em nuvem, banco de dados ou serviços externos de upload.
- Versionamento, edição, exclusão ou compartilhamento de documentos.
- Cadastro e gestão completa de usuários.
- Autenticação e autorização completas, até que o mecanismo de identidade seja definido.
- Pré-visualização, conversão ou processamento do conteúdo dos arquivos.

### Premissas e pendências

- O identificador do usuário deve vir de um principal confiável da requisição, e não de um valor arbitrário enviado pelo cliente. A aplicação ainda não define como autenticar ou fornecer esse principal; essa decisão é pré-requisito para implementar isolamento real entre usuários.
- O comportamento funcional esperado é que cada usuário liste e baixe somente os próprios documentos. Enquanto a identidade não estiver resolvida, esse requisito não pode ser considerado atendido por um simples cabeçalho ou parâmetro controlado pelo cliente.
- Os arquivos permanecem no disco após reinícios, mas os metadados em memória não. Após reiniciar o processo, os arquivos existentes não são listáveis nem recuperáveis pelo identificador, podendo tornar-se órfãos.
- A aplicação atende uma instância local. Não há garantia de compartilhamento ou consistência entre múltiplas instâncias.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um arquivo usando `multipart/form-data`. | Uma requisição válida armazena o arquivo localmente, registra seus metadados e retorna o documento criado. |
| RF-02 | O sistema associa o documento ao usuário da requisição. | O campo `owner` deriva do principal confiável definido pela aplicação. |
| RF-03 | O usuário pode listar seus documentos. | A listagem inclui somente documentos cujo `owner` corresponde ao usuário da requisição. |
| RF-04 | O usuário pode baixar um documento pelo identificador. | O conteúdo é enviado como anexo e somente ao proprietário autorizado. |
| RF-05 | O sistema rejeita upload sem arquivo ou com arquivo acima do limite configurado. | A API retorna erro JSON com código e mensagem estáveis, sem registrar metadados de um upload inválido. |
| RF-06 | O sistema informa estados de carregamento, lista vazia e falha no frontend. | O usuário recebe feedback e pode tentar novamente após falhas recuperáveis. |
| RF-07 | O sistema identifica documentos inexistentes ou não acessíveis. | O download não expõe caminhos locais nem dados de outro usuário. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são gravados exclusivamente no filesystem local, em `backend/storage` por padrão, usando Multer com `diskStorage`. |
| RNF-02 | Os metadados são mantidos em memória nesta fase; sua perda após reinício é comportamento esperado. |
| RNF-03 | Porta, diretório de armazenamento e limite de upload são configuráveis por variáveis de ambiente, com valores padrão documentados. |
| RNF-04 | O nome físico do arquivo é gerado pela aplicação e não deriva diretamente do nome ou caminho fornecido pelo cliente. |
| RNF-05 | O nome original é preservado apenas como metadado e tratado como dado não confiável ao compor cabeçalhos de download. |
| RNF-06 | A implementação backend usa Node.js, Express e CommonJS; o frontend usa React, Vite e módulos ES. Não se usa TypeScript nesta fase. |
| RNF-07 | Os testes backend usam o runner nativo `node:test`. |
| RNF-08 | Erros de entrada, filesystem e Multer são tratados nas bordas do sistema e convertidos para respostas HTTP previsíveis. |
| RNF-09 | Não são introduzidas dependências de armazenamento externo nem abstrações além das necessárias às camadas definidas. |

### Configuração

| Variável | Padrão | Finalidade |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local para os arquivos recebidos. Deve ser resolvido para um caminho absoluto na inicialização. |
| `MAX_FILE_SIZE_BYTES` | `10485760` (10 MiB) | Limite máximo por arquivo. Deve ser aplicado pelo Multer e documentado para o usuário da API. |

## 5. Modelo de dados

### Metadados públicos do documento

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | sim | Identificador único e opaco, gerado pelo servidor. |
| `originalName` | string | sim | Nome original informado pelo cliente, preservado para exibição e download. |
| `size` | number | sim | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | sim | Data e hora do upload em ISO 8601, UTC. |
| `owner` | string | sim | Identificador do usuário confiável associado à requisição. |

Exemplo de representação:

```json
{
  "id": "9e1d3cb6-19a2-4b79-94bd-b23e25b672f2",
  "originalName": "relatorio.pdf",
  "size": 48231,
  "uploadedAt": "2026-11-04T12:00:00.000Z",
  "owner": "user-123"
}
```

### Dados internos de armazenamento

O repositório pode manter, junto aos metadados em memória, um nome interno de arquivo (`storageName`) para localizar o conteúdo dentro de `STORAGE_DIR`. Esse dado é interno: não deve ser retornado pela API nem aceito do cliente. O nome físico deve ser gerado pelo servidor, por exemplo com `crypto.randomUUID()`, e nunca deve conter caminhos fornecidos pelo usuário.

### Persistência e integridade

- O repositório de metadados é em memória e indexa registros pelo campo `id`.
- O arquivo é escrito no disco pelo middleware Multer configurado com `diskStorage`.
- O serviço só registra os metadados depois que o upload foi concluído com sucesso.
- Falhas ao registrar metadados após gravar o arquivo devem resultar em tentativa de remover o arquivo recém-criado; falhas de limpeza devem ser registradas para diagnóstico sem mascarar o erro original.
- Não existe varredura ou recuperação automática de metadados após reinício nesta versão.

## 6. Contratos de API

As rotas abaixo são relativas ao backend. O frontend usa o prefixo `/api`; o proxy de desenvolvimento do Vite remove esse prefixo antes de encaminhar as chamadas ao backend.

### Formato comum de erro

Respostas de erro usam `application/json`:

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Envie um arquivo para continuar."
  }
}
```

O campo `code` é estável para tratamento pelo frontend. A mensagem é destinada à apresentação e não deve conter caminhos locais, stack traces ou detalhes internos.

### `POST /upload`

- **Content-Type:** `multipart/form-data`
- **Campo obrigatório:** `file` (um arquivo por requisição).
- **Sucesso:** `201 Created`, `application/json`.

Resposta:

```json
{
  "id": "9e1d3cb6-19a2-4b79-94bd-b23e25b672f2",
  "originalName": "relatorio.pdf",
  "size": 48231,
  "uploadedAt": "2026-11-04T12:00:00.000Z",
  "owner": "user-123"
}
```

Erros esperados:

| Status | Código | Condição |
| --- | --- | --- |
| `400` | `FILE_REQUIRED` | Campo `file` ausente ou sem arquivo. |
| `413` | `FILE_TOO_LARGE` | O arquivo excede `MAX_FILE_SIZE_BYTES`. |
| `400` | `INVALID_UPLOAD` | Multipart inválido ou mais de um arquivo enviado. |
| `401` | `UNAUTHENTICATED` | Não há principal de usuário confiável disponível. |
| `500` | `UPLOAD_FAILED` | Falha inesperada de gravação ou registro. |

### `GET /documents`

- **Sucesso:** `200 OK`, `application/json`.
- **Resposta:** array de metadados públicos pertencentes ao usuário da requisição. A lista vazia é `[]`.
- **Ordem:** mais recentes primeiro por `uploadedAt`; desempate determinístico por `id`.
- A API não recebe `owner` por query string para escolher a identidade consultada.

Exemplo:

```json
[
  {
    "id": "9e1d3cb6-19a2-4b79-94bd-b23e25b672f2",
    "originalName": "relatorio.pdf",
    "size": 48231,
    "uploadedAt": "2026-11-04T12:00:00.000Z",
    "owner": "user-123"
  }
]
```

Erros esperados: `401 UNAUTHENTICATED` se não houver principal confiável; `500 LIST_FAILED` em falha inesperada.

### `GET /documents/:id/download`

- **Sucesso:** `200 OK`, conteúdo binário como anexo.
- O nome apresentado no `Content-Disposition` deriva de `originalName`, devidamente tratado pela biblioteca/Express.
- O caminho físico é resolvido exclusivamente a partir do registro interno; `:id` não pode ser usado como caminho de filesystem.
- O documento deve pertencer ao principal da requisição.

Erros esperados:

| Status | Código | Condição |
| --- | --- | --- |
| `401` | `UNAUTHENTICATED` | Não há principal de usuário confiável. |
| `404` | `DOCUMENT_NOT_FOUND` | Identificador inexistente, documento de outro usuário ou arquivo local ausente. A resposta não deve revelar a existência de documento alheio. |
| `500` | `DOWNLOAD_FAILED` | Falha inesperada ao ler ou transmitir o arquivo. |

## 7. Decisões arquiteturais

### Backend

Fluxo de dependência obrigatório: `routes -> controllers -> services -> repositories`.

- **Routes:** registram os endpoints e associam a rota de upload ao middleware Multer configurado com `diskStorage` e limite de tamanho. Não contêm regras de negócio.
- **Controllers:** traduzem entrada/saída HTTP, validam a presença dos dados necessários, invocam serviços e convertem erros conhecidos em status e códigos de API.
- **Services:** concentram regras de negócio, associação ao usuário, autorização por proprietário, registro de metadados e coordenação das operações necessárias.
- **Repositories:** mantêm metadados em memória e fornecem acesso ao arquivo local. Não conhecem Express nem objetos de requisição/resposta.
- O controller converte o arquivo recebido pelo Multer em dados de entrada do serviço (`originalName`, `size`, `storageName`). O serviço coordena o repositório de metadados e o repositório de arquivos; este último verifica arquivos e executa remoções compensatórias. A configuração do diretório local é compartilhada com o middleware de upload.
- **Composição da aplicação:** configura Express e injeta dependências nas rotas; mantém o endpoint de saúde existente (`GET /health`).
- As camadas internas não dependem de Express. Não se adicionam banco de dados, armazenamento remoto ou estruturas arquiteturais além dessas quatro camadas.

### Frontend

- Componentes funcionais React com Hooks, organizados em `components/`, `pages/` e `services/` conforme a convenção do projeto.
- Um serviço centraliza chamadas `fetch` à API sob `/api` e interpreta o formato comum de erros.
- A interface permite selecionar e enviar um arquivo, consultar a lista e iniciar o download pelo identificador.
- A interface apresenta estados de carregamento, sucesso, lista vazia e falha sem duplicar a lógica de comunicação nos componentes.

## 8. Plano de execução

Este plano descreve etapas futuras de implementação. A entrega desta especificação não executa nem altera arquivos de backend ou frontend.

1. Resolver a origem confiável da identidade do usuário e confirmar requisitos operacionais, inclusive limite de tamanho e comportamento quando o processo reinicia.
2. Implementar a configuração da aplicação e as rotas backend, incluindo Multer `diskStorage`, diretório local, limites e tratamento dos erros de upload.
3. Implementar controllers, serviços e repositórios para registro em memória, listagem por proprietário, autorização de download e acesso seguro aos arquivos locais.
4. Cobrir os contratos e casos de erro do backend com testes `node:test`, incluindo upload, isolamento por usuário, arquivo inexistente, limite excedido e falhas do filesystem.
5. Implementar o serviço de API e os componentes React para upload, listagem e download, mantendo o uso do prefixo `/api` configurado no proxy do Vite.
6. Validar a integração de ponta a ponta e revisar os critérios de aceite, configuração por ambiente, mensagens de erro e comportamento em reinício.

## 9. Critérios de aceite da especificação

- Requisitos funcionais e não funcionais possuem identificadores e critérios verificáveis.
- Modelo de dados diferencia metadados públicos de informação interna de armazenamento.
- Os três contratos de API especificam entradas, respostas, erros e regras de propriedade.
- A arquitetura mantém a direção de dependência definida e o uso de Multer `diskStorage` local.
- O plano está ordenado e deixa claro que a implementação de backend e frontend é trabalho posterior.