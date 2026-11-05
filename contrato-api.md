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

## Listagens

Todo `GET /<recurso>` sem id é paginado: `page` começa em 1, `limit` vai de 1 a 100 (padrão 20) e `search` busca um trecho, sem diferenciar caixa, nos campos de texto do recurso. A resposta é `{ content, page, limit, totalElements, totalPages, last }`, ordenada por id crescente. `/questions/draw` e `/performance/**` não são paginados.

Quando a tela precisa da lista inteira, `listAll` (`shared/lib/pagination.ts`) percorre as páginas com `limit=100` até `last`. Para saber apenas o total, uma página com `limit=1` basta.

## Catálogo

`GET /knowledge-areas`, `/subjects`, `/topics` e `/entrance-exams`, percorridos com `listAll`, alimentam os filtros. A cascata área → disciplina → assunto é aplicada localmente e limpa seleções incompatíveis.

`GET /questions?page=1&limit=1` obtém `totalElements` do envelope. `GET /questions/draw` retorna uma lista com `answerOptions` e `images` embutidos, sem resolução.

Ambos combinam `knowledgeAreaId`, `subjectId`, `topicId`, `entranceExamId` e `difficulty` (1–3). Parâmetros vazios são omitidos. `size` do sorteio aceita 1–100; podem vir menos questões que o solicitado.

Na retomada, alternativas e imagens vêm de `/answer-options?questionId=...` e `/question-images?questionId=...`, também percorridos com `listAll`. A API devolve a resolução nula e omite o gabarito para estudantes; o adaptador também os exclui da sessão.

## Simulados

| Método e rota                             | Contrato                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET /mock-exams?userId=...&search=...`   | Histórico pessoal. A busca pelo nome vai à API; situação e ordem são aplicadas na tela.                                       |
| `POST /mock-exams`                        | `{ name, numQuestions, maxTime }`, tempo em minutos e dono derivado do token.                                                 |
| `GET /mock-exams/{id}`                    | Metadados e ciclo de vida.                                                                                                    |
| `PUT /mock-exams/{id}`                    | `{ name, numQuestions, maxTime }`. A tela preserva quantidade e, após início, tempo.                                          |
| `DELETE /mock-exams/{id}`                 | Remove simulado e respostas.                                                                                                  |
| `POST /mock-exam-questions`               | `{ mockExamId, questionId, answerOptionId: null }`.                                                                           |
| `GET /mock-exam-questions?mockExamId=...` | Vínculos, questão e alternativa marcada, todas as páginas. Ordem pelo id do vínculo.                                          |
| `POST /mock-exams/{id}/start`             | Sem corpo; retorna `MockExam`.                                                                                                |
| `PUT /mock-exam-questions/{linkId}`       | `{ mockExamId, questionId, answerOptionId }`; `null` limpa. A rota usa o id do vínculo.                                       |
| `POST /mock-exams/{id}/finish`            | Sem corpo; retorna `{ mockExam, subjects }`.                                                                                  |
| `GET /mock-exams/{id}/result`             | `{ mockExam, subjects }`. Vencido sem `finishedAt`: a tela chama `finish` antes de exibir; dentro do prazo, volta à execução. |
| `GET /mock-exams/{id}/review`             | Revisão, só após finalizar (`409` antes). Lista sem paginação, na ordem da prova.                                             |

`MockExam` contém `id`, `name`, `numQuestions`, `maxTime`, `createdAt`, `startedAt`, `finishedAt`, `answeredCount`, `correctCount` e `accuracy`. Os totais podem ser nulos antes de finalizar; `finishedAt` tem prioridade na determinação do estado.

Os vínculos fornecem `answerOption` (nula se em branco). Para estudantes,
`correct` e a explicação ficam nulos até a finalização.

Cada item da revisão traz `id` do vínculo, `answeredAt`, `correct`, `selectedAnswerOptionId` (os três nulos em branco), `question` com `explanation`, `images` e `answerOptions` com `rightAnswer`, em ordem de letra. A conferência do resultado e a tela `/simulados/{id}/revisao` usam essa rota, sempre depois de `loadResult` garantir a finalização. `correct` é a correção gravada na finalização e `rightAnswer`, o gabarito atual: se divergirem, a tela avisa que o gabarito foi corrigido depois da prova.

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

## Administração

As escritas do catálogo exigem o perfil administrador. O menu e as rotas `/admin` só aparecem quando `userRole.description` de `/auth/me`, normalizada como na API, é `ADMINISTRADOR`; a autorização continua no servidor (`403`).

As tabelas pedem 10 registros por página, com `search` e filtros enviados à API; os selects usam `listAll`.

| Recurso            | Corpo de `POST` e `PUT`                                                                   | Filtros usados                              |
| ------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------- |
| `/knowledge-areas` | `description`                                                                             | —                                           |
| `/subjects`        | `description`, `knowledgeAreaId`                                                          | `knowledgeAreaId`                           |
| `/topics`          | `description`, `subjectId`                                                                | `subjectId`                                 |
| `/addresses`       | `street`, `number`, `neighborhood`, `complement`, `cityId`                                | —                                           |
| `/institutions`    | `name`, `acronym`, `addressId`                                                            | —                                           |
| `/entrance-exams`  | `name`, `year`, `stage`, `institutionId`                                                  | `institutionId`                             |
| `/questions`       | `statement`, `explanation`, `difficulty`, `entranceExamId` e `topicId` **ou** `subjectId` | `subjectId`, `entranceExamId`, `difficulty` |
| `/answer-options`  | `questionId`, `letter` (A–E), `text`, `rightAnswer`                                       | `questionId`                                |
| `/question-images` | `questionId`, `url`, `subtitle`                                                           | `questionId`                                |

`/states` e `/cities?stateId=...&search=...` só alimentam a escolha da cidade do endereço.

- A instituição depende de um endereço próprio. O cliente cria o endereço e depois a instituição; se a segunda falhar, remove o endereço. Na exclusão, remove a instituição e depois o endereço.
- A API aceita uma única alternativa correta (`409` na segunda). Para transferir o gabarito, a anterior é desmarcada antes e restaurada se a nova gravação falhar.
- `409` de integridade ("registro em uso") aparece no diálogo de exclusão. Excluir uma disciplina remove seus assuntos (`ON DELETE CASCADE`); excluir uma questão remove alternativas e imagens.
- URLs de imagem aceitas: `http(s)://` ou caminho iniciado por `/`.

## Erros e tempo

- `400`: validação, incluindo mensagens por campo.
- `401`: encerra sessão autenticada; no login, credenciais inválidas.
- `403`: acesso negado, sem encerrar sessão.
- `404`: inexistência, inclusive resposta sem corpo.
- `409`: conflito; execução recarrega o simulado.
- `5xx`/rede: erro recuperável sem repetir mutações automaticamente.
- `204`: sucesso sem JSON.

Datas vêm sem fuso (`LocalDateTime`); configure `VITE_API_UTC_OFFSET` conforme a JVM. O backend rejeita alterações após `startedAt + maxTime` com `409`; a finalização após o prazo registra `finishedAt` no horário limite.
