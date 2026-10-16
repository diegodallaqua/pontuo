# Contrato consumido pelo React

Base local: `/api`, encaminhada pelo Vite para `http://localhost:8080`. Todas as rotas abaixo, exceto cadastro/login, recebem `Authorization: Bearer <accessToken>`.

## Autenticação

| Método e rota         | Entrada                                                     | Resposta                                                      |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| `POST /auth/register` | `username`, `email`, `birthDate` (`YYYY-MM-DD`), `password` | Usuário, sem login automático. O servidor define o papel.     |
| `POST /auth/login`    | `username` (usuário ou e-mail), `password`                  | `tokenType`, `accessToken`, `expiresIn` em segundos e `user`. |
| `GET /auth/me`        | —                                                           | Identidade confirmada.                                        |
| `POST /auth/logout`   | —                                                           | `204`, revoga o token.                                        |

O cadastro valida senha com mínimo de 8 caracteres e limite de 72 bytes para BCrypt. Não há segredo de assinatura no cliente.

## Catálogo

`GET /knowledge-areas`, `/subjects`, `/topics` e `/entrance-exams` alimentam os filtros. A cascata área → disciplina → assunto é aplicada localmente e limpa seleções incompatíveis.

`GET /questions?page=0&size=1` obtém `totalElements` de um envelope paginado. `GET /questions/draw` retorna uma lista com `answerOptions` e `images` embutidos, sem resolução.

Ambos combinam `knowledgeAreaId`, `subjectId`, `topicId`, `entranceExamId` e `difficulty` (1–3). Parâmetros vazios são omitidos. `size` do sorteio aceita 1–100; podem vir menos questões que o solicitado.

Na retomada, alternativas e imagens vêm de `/answer-options?questionId=...` e `/question-images?questionId=...`. O adaptador remove resolução e dados de gabarito da sessão.

## Simulados

| Método e rota                             | Contrato                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `GET /mock-exams?userId=...`              | Histórico pessoal.                                                                      |
| `POST /mock-exams`                        | `{ name, numQuestions, maxTime }`, tempo em minutos e dono derivado do token.           |
| `GET /mock-exams/{id}`                    | Metadados e ciclo de vida.                                                              |
| `PUT /mock-exams/{id}`                    | `{ name, numQuestions, maxTime }`. A tela preserva quantidade e, após início, tempo.    |
| `DELETE /mock-exams/{id}`                 | Remove simulado e respostas.                                                            |
| `POST /mock-exam-questions`               | `{ mockExamId, questionId, answerOptionId: null }`.                                     |
| `GET /mock-exam-questions?mockExamId=...` | Vínculos, questão e alternativa marcada. Ordenação local pelo id do vínculo.            |
| `POST /mock-exams/{id}/start`             | Sem corpo; retorna `MockExam`.                                                          |
| `PUT /mock-exam-questions/{linkId}`       | `{ mockExamId, questionId, answerOptionId }`; `null` limpa. A rota usa o id do vínculo. |
| `POST /mock-exams/{id}/finish`            | Sem corpo; retorna `{ mockExam, subjects }`.                                            |
| `GET /mock-exams/{id}/result`             | `{ mockExam, subjects }`; a tela redireciona se ainda não estiver finalizado.           |

`MockExam` contém `id`, `name`, `numQuestions`, `maxTime`, `createdAt`, `startedAt`, `finishedAt`, `answeredCount`, `correctCount` e `accuracy`. Os totais podem ser nulos antes de finalizar; `finishedAt` tem prioridade na determinação do estado.

Os vínculos fornecem `correct` e `answerOption` (nula se em branco). O React usa correção apenas no resultado. Não há contrato de gabarito completo para estudantes: veja [Análise da API](docs/analise-api.md).

## Desempenho

As consultas usam `/performance/me` e simulados finalizados:

| Sufixo             | Parâmetros enviados                                                        |
| ------------------ | -------------------------------------------------------------------------- |
| `/overview`        | `from`, `to`                                                               |
| `/evolution`       | `from`, `to`, `subjectId`                                                  |
| `/knowledge-areas` | `from`, `to`, `entranceExamId`                                             |
| `/subjects`        | `from`, `to`, `entranceExamId`; adaptador admite também `knowledgeAreaId`. |
| `/topics`          | `from`, `to`, `entranceExamId`, `subjectId`                                |
| `/difficulty`      | `from`, `to`, `entranceExamId`                                             |
| `/weak-topics`     | `from`, `to`, `entranceExamId`, `minQuestions=5`, `limit=5`                |

Datas são inclusivas sobre a finalização. Vestibular não filtra resumo/evolução. Agrupamentos têm `id`, `description`, `questions`, `answered`, `correct`, `accuracy`; dificuldade usa id 1/2/3 e descrição nula.

Resumo: `finishedMockExams`, `questions`, `answered`, `correct`, `accuracy`, `averageDurationMinutes`. Evolução: `mockExamId`, `mockExamName`, `finishedAt`, `questions`, `answered`, `correct`, `accuracy`.

## Erros e tempo

- `400`: validação, incluindo mensagens por campo.
- `401`: encerra sessão autenticada; no login, credenciais inválidas.
- `403`: acesso negado, sem encerrar sessão.
- `404`: inexistência, inclusive resposta sem corpo.
- `409`: conflito; execução recarrega o simulado.
- `5xx`/rede: erro recuperável sem repetir mutações automaticamente.
- `204`: sucesso sem JSON.

Datas vêm sem fuso (`LocalDateTime`); configure `VITE_API_UTC_OFFSET` conforme a JVM. O prazo ainda não é imposto pelo backend.
