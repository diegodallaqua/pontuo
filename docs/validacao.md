# Validação da migração

Ambiente: Windows, Node 24.20.0, npm 11.19.0. Ferramentas fixadas no lockfile.

| Comando                | Verificação                                                       |
| ---------------------- | ----------------------------------------------------------------- |
| `npm run typecheck`    | TypeScript estrito na aplicação, testes e configuração.           |
| `npm test`             | 26 casos unitários: regras, compensação, HTTP, adaptação e datas. |
| `npm run build`        | Tipagem e bundle de produção.                                     |
| `npm run test:e2e`     | 15 cenários de Chromium com contratos HTTP simulados.             |
| `npm run format:check` | Formatação consistente dos arquivos ativos.                       |

Os cenários de navegador cobrem cadastro/login, rotas privadas, montagem, início, resposta/limpeza, retomada, resultado, falha de gravação, bloqueio durante gravação, timeout, 409, filtros dependentes, edição/exclusão, 401/403, filtros da análise, menu móvel, senha visível e logout.

Fixtures existem apenas em `tests/e2e`; a aplicação não tem dados inventados nem fallback de demonstração. O interceptador corresponde somente a caminhos iniciados por `/api/`, preservando módulos servidos pelo Vite.

Capturas em `.artifacts/` são geradas nos testes e foram inspecionadas em desktop e celular. Elas não são snapshots rígidos por pixel. O diretório é ignorado pelo Git.

## Limite da verificação

O backend não estava em execução em `localhost:8080`. Campos e requisições foram confrontados com os controllers/DTOs locais, mas não houve teste integrado com Spring/MariaDB reais. Testes de frontend não substituem validação de autorização, constraints e concorrência da API.

## Conferir com a API real

Use um estudante de teste e o banco de desenvolvimento:

1. Inicie MariaDB e `api-pontuo` conforme sua documentação. Confirme o offset da JVM para `VITE_API_UTC_OFFSET`.
2. Execute `npm run dev`, abra `http://127.0.0.1:5173` e cadastre um estudante.
3. Faça login; sem histórico, os indicadores devem mostrar estados vazios.
4. Monte um simulado usando questões/alternativas cadastradas e confira a quantidade real sorteada.
5. Inicie, responda, navegue, recarregue e confirme a persistência da resposta.
6. Finalize com uma questão em branco e compare contagens, nota e disciplinas com a resposta da API.
7. Confira histórico e desempenho, respeitando a semântica de período/vestibular.
8. Faça logout e verifique que a API rejeita o token revogado, sem expor tokens em capturas.

Limites de contrato restantes, incluindo gabarito incompleto, datas sem fuso e ausência de finalização em segundo plano: [Análise da API](analise-api.md).
