# Pontuo

**Language:** [English](README.md) | [Português (Brasil)](README.pt-BR.md)

Frontend for a university entrance exam practice platform, rebuilt with **React + Vite + TypeScript**. Students choose what to study, take practice exams, and track their performance. The application uses the Spring Boot API from [`api-pontuo`](../api-pontuo).

## Run locally

Requirements: Node.js **24 or later**, npm, and the API configured with MariaDB as described in the backend README. Node 24.20.0 was used during this migration.

```powershell
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. If your PowerShell policy blocks `npm.ps1`, use `npm.cmd` for the same commands.

Vite proxies `/api` to `http://localhost:8080`. There are no demo accounts, default passwords, or demo mode: use **Create account** to register a student through the API. If the backend is unavailable, the interface displays an error and lets you retry.

To customize the configuration, copy `.env.example` to `.env.local` and adjust the URLs. The defaults work without an environment file. Restart Vite after changing environment variables.

| Variable              | Purpose                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`   | Base URL for requests, including `/api`. Default: `/api`.                                                   |
| `API_PROXY_TARGET`    | Local proxy target. Default: `http://localhost:8080`. This value is not included in the client bundle.      |
| `VITE_API_UTC_OFFSET` | Offset used by the JVM when producing `LocalDateTime` values. Explicit default: `-03:00`; check your setup. |

**Do not put `JWT_SECRET` in the frontend.** Every `VITE_*` variable is public. The API verifies the token signature; the client uses the token and handles expiration.

## Features

- Registration, login, session restoration, expiration, and logout with token revocation.
- Dashboard with real metrics, progress over time, subjects to revisit, and recent practice exams.
- Exam setup by knowledge area, subject, topic, entrance exam, and difficulty, with combined filters, available question count, and configurable duration.
- Exam sessions with an explicit start, deadline timer, navigation, confirmed answer saving, answer clearing, resume, and automatic completion.
- History with search, filters, local pagination, editing, and confirmed deletion.
- Server-calculated results, correct/incorrect/unanswered counts, answer review, and performance by subject.
- Analysis by knowledge area, subject, topic, and difficulty, plus progress with a table alternative and topics to revisit.
- Responsive layout, keyboard and focus support, loading/error/empty states, and reduced-motion support.

The answer review shows **which option the student selected and whether it was correct**. When an answer is wrong or blank, the API does not tell the student which option was correct; the frontend does not invent an answer key. See the [API analysis (Portuguese)](docs/analise-api.md).

An error-review page remains outside the MVP. No aggregation tables or exam-filter tables were created.

## Project structure

```text
src/
  app/                     composition, providers, routes, layout, and global styles
  features/
    auth/                  authentication, sessions, and access forms
    catalog/               types and queries for filters
    dashboard/             dashboard composition
    mock-exams/             setup, sessions, history, and results
    performance/            metrics, analysis, and charts
  shared/
    lib/                   HTTP transport, errors, and dates
    hooks/                 cancellable asynchronous loading
    ui/                    reusable visual components
tests/e2e/                 browser flows with a simulated contract API
docs/                      architecture and backend analysis (Portuguese)
```

Each feature keeps its own code together. The `domain`, `application`, `api`, and `ui` folders exist only where their contents justify the separation.

In React, **components** are functions that describe the interface. **State** (`useState`) holds values that change on screen. **Hooks** group behavior tied to state or lifecycle. Adapters know URLs and DTOs; domain rules do not import React or make HTTP requests.

Read the [architecture and reading guide (Portuguese)](docs/arquitetura.md) to follow a flow and understand how Clean Architecture and SOLID are applied.

## Commands and checks

```powershell
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run format:check
```

Unit tests cover exam setup, compensating actions, HTTP, answer-key isolation, dates, and analysis. Browser tests use fixtures in `tests/e2e/contract-api.ts` and do not write to MariaDB. Playwright starts and stops Vite as needed; local screenshots go into `.artifacts/`, which Git ignores.

See [validation (Portuguese)](docs/validacao.md). The contracts were checked against local Java code; **integration with a running Spring/MariaDB backend was not tested**, because the API was unavailable at `localhost:8080`.

Main versions: React 19.3.1, Vite 8.3.4, and TypeScript 7.0.2. The author confirmed the choice of compatible stable versions. `package.json` pins direct dependencies; `package-lock.json` pins the full dependency tree. Use `npm ci` to reproduce it.

## Build and deployment

`npm run build` creates `dist/`; `npm run preview` serves that build locally. This is a single-page application: hosting must serve `index.html` for UI routes such as `/simulados/100/execucao` and handle `/api` separately.

In production, configure a reverse proxy at `/api` or set `VITE_API_BASE_URL=https://your-api.example/api` **before building**. In the latter case, set `CORS_ALLOWED_ORIGINS` in Spring to the frontend's exact origin. Vite's proxy is not a production server.

## References

- [Thinking in React](https://react.dev/learn/thinking-in-react): components, state, and data flow.
- [Vite guide](https://vite.dev/guide/): local server and build.
- [React Router declarative mode](https://reactrouter.com/start/declarative/installation): the routing mode used here.
