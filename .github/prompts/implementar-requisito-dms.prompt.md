---
description: Implementa um requisito funcional do DMS seguindo a especificação, a arquitetura e as convenções do projeto.
name: implementar-requisito-dms
argument-hint: RF-ID ou descrição da funcionalidade
agent: agent
---

# Implementar requisito do DMS

Implemente somente o requisito `${input:requisito:RF-ID ou descrição da funcionalidade}`.

Antes de editar:

- Consulte [a especificação do DMS](../../docs/specs/dms-spec.md) e as [instruções do projeto](../copilot-instructions.md).
- Inspecione as camadas, componentes e testes relevantes já existentes.
- Confirme o contrato e os critérios de aceite aplicáveis ao requisito.

Durante a implementação:

- Siga a Clean Architecture simples no backend: `routes -> controllers -> services -> repositories`.
- Mantenha uploads no filesystem local com Multer `diskStorage` e metadados em memória.
- No frontend, siga os padrões existentes e centralize chamadas HTTP no serviço de API.
- Altere somente os arquivos necessários para o requisito; evite refatorações não relacionadas.
- Preserve os contratos e funcionalidades existentes. Se faltar uma decisão na especificação, registre a pendência em vez de inventar comportamento incompatível.

Ao concluir:

- Adicione ou atualize testes focados seguindo os padrões do projeto.
- Execute os testes e builds relevantes para as áreas alteradas.
- Resuma o que mudou, quais validações passaram e qualquer decisão pendente.
