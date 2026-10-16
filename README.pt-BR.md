# Pontuo

**Idioma:** [Português (Brasil)](README.pt-BR.md) | [English](README.md)

Frontend da plataforma de simulados de vestibulares, reconstruído em **React + Vite + TypeScript**. O aluno escolhe seu foco, responde a um simulado e acompanha seu desempenho. A aplicação usa a API Spring Boot de [`api-pontuo`](../api-pontuo).

## Executar localmente

Requisitos: Node.js **24 ou superior**, npm e a API configurada com MariaDB conforme o README do backend. O Node verificado nesta migração foi o 24.20.0.

```powershell
npm ci
npm run dev
```

Abra **http://127.0.0.1:5173**. Se a política do PowerShell bloquear `npm.ps1`, use `npm.cmd` nos mesmos comandos.

O Vite encaminha `/api` para `http://localhost:8080`. Não há contas fictícias, senha padrão ou modo de demonstração: use **Criar conta** para cadastrar um estudante na API. Se o backend estiver desligado, a interface mostra o erro e permite tentar novamente.

Para personalizar, copie `.env.example` para `.env.local` e ajuste as URLs. Os padrões permitem iniciar sem copiar o arquivo. Reinicie o Vite depois de alterar variáveis.

| Variável              | Uso                                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`   | Base das requisições incluindo `/api`. Padrão: `/api`.                                                   |
| `API_PROXY_TARGET`    | Destino do proxy local. Padrão: `http://localhost:8080`. Não entra no bundle.                            |
| `VITE_API_UTC_OFFSET` | Offset usado pela JVM ao produzir `LocalDateTime`. Padrão explícito: `-03:00`; confirme no seu ambiente. |

**Não copie `JWT_SECRET` para o frontend.** Toda variável `VITE_*` é pública. A API verifica a assinatura; o cliente usa o token e trata sua expiração.

## Funcionalidades

- Cadastro, login, restauração da sessão, expiração e logout com revogação.
- Visão geral com indicadores reais, evolução, disciplinas para reforçar e simulados recentes.
- Montagem por área, disciplina, assunto, vestibular e dificuldade, com filtros combinados, quantidade disponível e tempo configurável.
- Execução com início explícito, cronômetro por prazo, navegação, salvamento confirmado, limpeza de resposta, retomada e finalização automática.
- Histórico com busca, filtros, paginação local, edição e exclusão confirmada.
- Resultado calculado no backend, acertos/erros/em branco, conferência das respostas e desempenho por disciplina.
- Análise por área, disciplina, assunto e dificuldade, evolução com tabela alternativa e assuntos para reforçar.
- Layout responsivo, teclado, foco, estados de carregamento/erro/vazio e movimento reduzido.

A conferência exibe **a alternativa marcada e se ela estava correta**. A API não informa a alternativa correta ao estudante quando ele erra ou deixa em branco; o frontend não inventa um gabarito. Veja [Análise da API](docs/analise-api.md).

A tela de revisão de erros continua fora do MVP. Não foram criadas tabelas de agregação nem tabelas de filtros do simulado.

## Organização

```text
src/
  app/                     composição, providers, rotas, layout e estilos gerais
  features/
    auth/                  autenticação, sessão e formulários de acesso
    catalog/               tipos e consultas para os filtros
    dashboard/             composição da visão geral
    mock-exams/             montagem, execução, histórico e resultado
    performance/            indicadores, análises e gráfico
  shared/
    lib/                   transporte HTTP, erros e datas
    hooks/                 carregamento assíncrono com cancelamento
    ui/                    componentes visuais reutilizáveis
tests/e2e/                 fluxos de navegador com API simulada por contrato
docs/                      arquitetura e análise do backend
```

Cada funcionalidade concentra seu código. As pastas `domain`, `application`, `api` e `ui` só existem quando há conteúdo que justifica a separação.

Em React, **componentes** são funções que descrevem a interface. **Estado** (`useState`) guarda o que muda na tela. **Hooks** reúnem comportamento associado ao estado ou ciclo de vida. Adaptadores conhecem URLs e DTOs; as regras de domínio não importam React nem fazem HTTP.

Leia [Arquitetura e guia de leitura](docs/arquitetura.md) para acompanhar um fluxo e entender a aplicação de Clean Architecture e SOLID.

## Comandos e verificações

```powershell
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run format:check
```

Os testes unitários cobrem montagem, compensação, HTTP, isolamento do gabarito, datas e análise. Os testes de navegador usam fixtures em `tests/e2e/contract-api.ts`, sem escrever no MariaDB. O Playwright inicia e encerra o Vite quando precisa; capturas locais ficam em `.artifacts/`, ignorada pelo Git.

Consulte [Validação](docs/validacao.md). Os contratos foram conferidos no código Java local; **a integração com Spring/MariaDB reais não foi executada**, pois a API não estava disponível em `localhost:8080`.

Versões principais: React 19.3.1, Vite 8.3.4 e TypeScript 7.0.2. A escolha das versões estáveis compatíveis foi confirmada pelo autor. `package.json` fixa as versões diretas; `package-lock.json` fixa a árvore completa. Use `npm ci` para reproduzi-la.

## Build e hospedagem

`npm run build` gera `dist/`; `npm run preview` confere esse build localmente. A aplicação é uma SPA: a hospedagem precisa devolver `index.html` para rotas de interface, como `/simulados/100/execucao`, e tratar `/api` separadamente.

Em produção, configure um reverse proxy em `/api` ou defina `VITE_API_BASE_URL=https://sua-api.example/api` **antes do build**. No segundo caso, configure `CORS_ALLOWED_ORIGINS` no Spring para a origem exata do frontend. O proxy do Vite não é um servidor de produção.

## Referências

- [Pensando em React](https://react.dev/learn/thinking-in-react): componentes, estado e fluxo de dados.
- [Guia do Vite](https://vite.dev/guide/): servidor local e build.
- [React Router declarativo](https://reactrouter.com/start/declarative/installation): roteamento adotado.
