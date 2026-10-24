# Análise da API para a migração

Análise inicial em **15/10/2026**, a partir dos DTOs, controllers, serviços, repositórios e configuração do checkout local `../api-pontuo`. As correções dos itens 1 e 3 foram implementadas na API em **23/10/2026**.

## O que a API já oferece

O fluxo do estudante está disponível: autenticação, catálogo, sorteio combinado, criação e vínculos, início, resposta, finalização, histórico e análise. A API verifica propriedade dos registros, alternativa pertencente à questão, quantidade máxima de vínculos e estado finalizado. Nota e correção são calculadas no servidor. O sorteio embute alternativas e imagens sem baixar todo o banco.

O frontend usa `/performance/me` e envia o próprio `userId` na listagem de simulados, mantendo o escopo pessoal inclusive para uma conta administradora. O contrato está em [`contrato-api.md`](../contrato-api.md).

## 1. Correção e resolução antes da finalização — corrigido

Antes da correção, `/mock-exam-questions` expunha `correct` e a explicação,
inclusive durante a prova. `/questions`, `/answer-options` e
`/question-images` também podiam expor a explicação.

Agora a API devolve `correct` e a explicação como nulos nos vínculos de um
simulado ainda não finalizado para estudantes. Após `finish`, ambos têm valor
na consulta dos vínculos respondidos. As consultas gerais de questões,
alternativas e imagens devolvem a explicação nula para estudantes; o
administrador conserva o acesso para revisão.

## 2. Resultado sem gabarito completo

`MockExamResultResponseDTO` contém `mockExam` e `subjects`. O vínculo informa alternativa marcada e `correct`, mas não qual é a correta quando há erro ou resposta em branco. `rightAnswer` continua reservado ao administrador mesmo após finalizar.

O frontend entrega nota, análise por disciplina e **conferência das respostas enviadas**. Um gabarito completo requer um contrato de resultado autorizado após finalizar que informe a alternativa certa. É uma lacuna do contrato do resultado, distinta da tela de revisão de erros, mantida fora do escopo.

## 3. Prazo e configuração — bloqueio implementado na API

`maxTime` agora fica fixo após o início. A API recusa com `409` alterações no
simulado e nos vínculos a partir de `startedAt + maxTime`. A finalização pode
ser pedida após o vencimento e grava `finishedAt` no horário limite.

O React continua tentando finalizar com a página aberta ou ao retomar. Não há
finalização em segundo plano com o navegador fechado: um simulado vencido
permanece sem boletim até uma chamada a `finish`, embora respostas tardias já
sejam recusadas pelo servidor.

## 4. Datas sem fuso

DTOs usam `LocalDateTime`, e o serviço chama `LocalDateTime.now()`. Interpretar essas strings no fuso de cada navegador desloca o cronômetro.

O frontend explicita a premissa com `VITE_API_UTC_OFFSET=-03:00`. Ela deve corresponder à JVM, não apenas ao aluno. Timestamps que já contêm offset são preservados. `Instant`/UTC ou `OffsetDateTime`, com prazo calculado pelo servidor, eliminariam a ambiguidade.

## 5. Montagem em múltiplas requisições

Sorteio, criação e um POST por vínculo não formam uma transação única. O cliente compensa falhas de vinculação excluindo o simulado; se a exclusão falhar, informa o id para recuperação.

Se a criação for concluída e sua resposta se perder na rede, o cliente pode nem conhecer o id. Repetir POSTs automaticamente poderia duplicar registros, então o HTTP não repete mutações sozinho. Um endpoint transacional com idempotência resolveria esse cenário no servidor; nenhum endpoint inexistente foi presumido.

O servidor também permite começar com menos vínculos que `numQuestions`. A tela bloqueia sessões incompletas ou questões sem alternativas suficientes. Essa integridade deve existir em `start` para outros clientes também.

## 6. Concorrência

Nos trechos inspecionados não há `@Version` ou lock explícito para serializar mudanças do agregado. `@Transactional` em `finish` garante uma transação, mas por si só não garante a serialização necessária com uma resposta ou outra finalização concorrente.

A interface evita operações simultâneas na mesma sessão e reconcilia `409`; não controla outras abas ou clientes. A consistência final depende do backend. Versão otimista ou bloqueio devem ser avaliados com testes de integração concorrentes.

## 7. Custo de retomada e listagens

Vínculos não contêm todas as alternativas/imagens. Recarregar custa até `2 + 2N` GETs: metadados, vínculos e duas listas por questão. O cliente limita a quatro questões em paralelo e reaproveita em memória o último sorteio na navegação imediata.

Um endpoint de sessão completo, sem gabarito, reduziria esse custo. DTOs menores evitariam repetir usuário, endereços e questões aninhadas sem uso na tela.

Só `/questions` tem paginação no servidor. A paginação do histórico é local: melhora a leitura, não reduz a transferência. Paginação no servidor passa a importar com o crescimento do volume.

## 8. Semântica da análise

`accuracy` geral usa `correctCount / numQuestions`, incluindo brancos. Agrupamentos usam questões vinculadas do grupo. A interface respeita isso e não calcula média simples de percentuais.

A classificação por disciplina/assunto é a atual. Reclassificar uma questão pode mudar distribuições históricas, embora `is_correct` permaneça congelado. É um compromisso já presente no modelo.

O painel exige pelo menos cinco questões por disciplina para sugerir foco; `/weak-topics` usa `minQuestions=5`. Detalhamentos sinalizam amostras pequenas. Não foram criadas tabelas de agregação ou filtros, e a revisão de erros continua fora do MVP.

## Limite da validação

O código dos contratos foi inspecionado, mas a API não estava em execução na porta 8080. Os testes de navegador simulam os contratos e não comprovam MariaDB, seed, concorrência ou configuração da JVM. Veja [Validação](validacao.md) para a sequência de conferência real.
