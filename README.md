# Document Management System com GitHub Copilot

<img src="https://octodex.github.com/images/Professortocat_v2.png" align="right" height="200px" />

Hey ginardino!

Mona here. I'm done preparing your exercise. Hope you enjoy! 💚

Remember, it's self-paced so feel free to take a break! ☕️

[![](https://img.shields.io/badge/Go%20to%20Exercise-%E2%86%92-1f883d?style=for-the-badge&logo=github&labelColor=197935)](https://github.com/treinamentos-serpro/document-management-system-gisele-nardino-0411/issues/1)

## Validação contínua

O workflow [CI](.github/workflows/ci.yml) roda em cada `push` e `pull_request`,
com Node.js 24. Ele instala as dependências usando os lockfiles, compila o
frontend e executa os testes do backend.

Para executar as mesmas etapas localmente:

```bash
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix frontend run build
npm --prefix backend test
```

Os testes HTTP usam uma porta dinâmica e armazenamento temporário, sem alterar
os documentos da aplicação. Eles cobrem upload, listagem, download e erros de
entrada ou arquivo ausente.

---

&copy; 2025 GitHub &bull; [Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md) &bull; [MIT License](https://gh.io/mit)
