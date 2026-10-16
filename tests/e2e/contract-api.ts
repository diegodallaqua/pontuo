import type { Page } from '@playwright/test';
import type { MockExam } from '../../src/features/mock-exams/domain/mock-exam';

// Fixtures exclusivas dos testes. A aplicação de produção sempre usa a API real.
export const user = {
  id: 7,
  username: 'Mariana',
  email: 'mariana@example.test',
  birthDate: '2005-03-12',
  userRole: { id: 2, description: 'Estudante' },
};
const knowledgeAreas = [
  { id: 1, description: 'Matemática e suas Tecnologias' },
  { id: 2, description: 'Ciências da Natureza' },
];
const subjects = [
  { id: 1, description: 'Matemática', knowledgeArea: knowledgeAreas[0]! },
  { id: 2, description: 'Biologia', knowledgeArea: knowledgeAreas[1]! },
];
const topics = [
  { id: 1, description: 'Aritmética', subject: subjects[0]! },
  { id: 2, description: 'Ecologia', subject: subjects[1]! },
];
const entranceExams = [
  {
    id: 1,
    name: 'ENEM',
    year: 2025,
    stage: 'Aplicação regular',
    institution: { id: 1, name: 'Instituto Nacional de Estudos e Pesquisas', acronym: 'INEP' },
  },
];
export const questions = [1, 2].map((id) => ({
  id,
  statement: id === 1 ? 'Quanto é 2 + 2?' : 'Qual número é divisível por 2?',
  difficulty: 1,
  entranceExam: entranceExams[0]!,
  topic: topics[0]!,
  subject: null,
  images: [],
  answerOptions: [
    { id: id * 100 + 1, letter: 'A', text: id === 1 ? '4' : '8' },
    { id: id * 100 + 2, letter: 'B', text: id === 1 ? '5' : '7' },
    { id: id * 100 + 3, letter: 'C', text: '9' },
  ],
}));
type TestLink = {
  id: number;
  question: (typeof questions)[number] & { explanation: string };
  answerOption: (typeof questions)[number]['answerOptions'][number] | null;
  correct: boolean | null;
};
export function apiDate(time = Date.now()) {
  return new Date(time - 3 * 60 * 60_000).toISOString().slice(0, -1);
}
export function makeExam(patch: Partial<MockExam> = {}): MockExam {
  return {
    id: 100,
    name: 'Treino de matemática',
    numQuestions: 2,
    maxTime: 30,
    createdAt: apiDate(),
    startedAt: null,
    finishedAt: null,
    answeredCount: null,
    correctCount: null,
    accuracy: null,
    ...patch,
  };
}
export async function mockContractApi(
  page: Page,
  options: { authenticated?: boolean; history?: boolean; exam?: MockExam } = {},
) {
  const history = options.history
    ? [
        makeExam({
          id: 10,
          name: 'ENEM · Ciências da Natureza',
          numQuestions: 20,
          startedAt: apiDate(Date.now() - 90_000),
          maxTime: 60,
        }),
        makeExam({
          id: 9,
          name: 'Matemática: um passo à frente',
          numQuestions: 20,
          startedAt: '2026-10-14T10:00:00',
          finishedAt: '2026-10-14T10:40:00',
          answeredCount: 20,
          correctCount: 15,
          accuracy: 75,
        }),
        makeExam({
          id: 8,
          name: 'Meu treino de Biologia',
          numQuestions: 15,
          startedAt: '2026-10-12T10:00:00',
          finishedAt: '2026-10-12T10:30:00',
          answeredCount: 15,
          correctCount: 9,
          accuracy: 60,
        }),
        makeExam({
          id: 7,
          name: 'ENEM · Conhecimentos gerais',
          numQuestions: 30,
          startedAt: '2026-10-10T10:00:00',
          finishedAt: '2026-10-10T11:00:00',
          answeredCount: 30,
          correctCount: 18,
          accuracy: 60,
        }),
      ]
    : [];
  const state = {
    exams: options.exam ? [options.exam] : history,
    links: [] as TestLink[],
    requests: [] as {
      path: string;
      method: string;
      query: Record<string, string>;
      body: Record<string, unknown> | null;
    }[],
    emptyCatalog: false,
    saveFailures: 0,
    saveDelay: 0,
    startConflict: false,
    unauthorizedPath: '',
    forbiddenPath: '',
    finishCalls: 0,
    logoutCalls: 0,
  };
  if (options.exam)
    state.links = questions.map((question, index) => ({
      id: 501 + index,
      question: { ...question, explanation: 'EXPLICAÇÃO NÃO DEVE APARECER NA PROVA' },
      answerOption: null,
      correct: null,
    }));
  if (options.authenticated !== false)
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('pontuo.session.v1'))
        sessionStorage.setItem(
          'pontuo.session.v1',
          JSON.stringify({ accessToken: 'contract-test-token', expiresAt: Date.now() + 7_200_000 }),
        );
    });
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname.replace(/^\/api/, '');
      const method = request.method();
      const body = request.postDataJSON() as Record<string, unknown> | null;
      state.requests.push({ path, method, query: Object.fromEntries(url.searchParams), body });
      const respond = (data: unknown, status = 200) =>
        status === 204
          ? route.fulfill({ status })
          : route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
      if (path === state.unauthorizedPath) return respond({ message: 'Token expirado' }, 401);
      if (path === state.forbiddenPath) return respond({ message: 'Acesso negado' }, 403);
      if (path === '/auth/me') return respond(user);
      if (path === '/auth/login')
        return respond({
          accessToken: 'contract-test-token',
          tokenType: 'Bearer',
          expiresIn: 7200,
          user,
        });
      if (path === '/auth/register') return respond(user, 201);
      if (path === '/auth/logout') {
        state.logoutCalls++;
        return respond(null, 204);
      }
      if (path === '/knowledge-areas') return respond(knowledgeAreas);
      if (path === '/subjects') return respond(subjects);
      if (path === '/topics') return respond(topics);
      if (path === '/entrance-exams') return respond(entranceExams);
      if (path === '/questions')
        return respond({
          content: [],
          page: 0,
          size: 1,
          totalElements: state.emptyCatalog ? 0 : 2,
          totalPages: 2,
          last: false,
        });
      if (path === '/questions/draw') return respond(state.emptyCatalog ? [] : questions);
      if (path === '/answer-options')
        return respond(
          questions.find((item) => item.id === Number(url.searchParams.get('questionId')))
            ?.answerOptions ?? [],
        );
      if (path === '/question-images') return respond([]);
      if (path === '/mock-exams' && method === 'GET') return respond(state.exams);
      if (path === '/mock-exams' && method === 'POST') {
        const exam = makeExam(body as unknown as Partial<MockExam>);
        state.exams.push(exam);
        return respond(exam, 201);
      }
      if (path === '/mock-exam-questions' && method === 'GET') return respond(state.links);
      if (path === '/mock-exam-questions' && method === 'POST') {
        const question = questions.find((item) => item.id === body?.questionId)!;
        const link = {
          id: 501 + state.links.length,
          question: { ...question, explanation: 'EXPLICAÇÃO NÃO DEVE APARECER NA PROVA' },
          answerOption: null,
          correct: null,
        };
        state.links.push(link);
        return respond(link, 201);
      }
      const linkMatch = path.match(/^\/mock-exam-questions\/(\d+)$/);
      if (linkMatch && method === 'PUT') {
        if (state.saveDelay) await new Promise((resolve) => setTimeout(resolve, state.saveDelay));
        if (state.saveFailures > 0) {
          state.saveFailures--;
          return respond({ message: 'Falha de gravação' }, 503);
        }
        const link = state.links.find((item) => item.id === Number(linkMatch[1]))!;
        link.answerOption =
          link.question.answerOptions.find((item) => item.id === body?.answerOptionId) ?? null;
        link.correct = link.answerOption ? link.answerOption.letter === 'A' : null;
        return respond(link);
      }
      const examMatch = path.match(/^\/mock-exams\/(\d+)(?:\/(start|finish|result))?$/);
      if (examMatch) {
        const exam = state.exams.find((item) => item.id === Number(examMatch[1]));
        if (!exam) return respond({ message: 'Não encontrado' }, 404);
        if (method === 'DELETE') {
          state.exams = state.exams.filter((item) => item.id !== exam.id);
          return respond(null, 204);
        }
        if (method === 'PUT') {
          Object.assign(exam, body);
          return respond(exam);
        }
        if (examMatch[2] === 'start') {
          exam.startedAt = apiDate();
          if (state.startConflict) {
            state.startConflict = false;
            return respond({ message: 'simulado já iniciado' }, 409);
          }
          return respond(exam);
        }
        const result = () => ({
          mockExam: exam,
          subjects: exam.finishedAt
            ? [
                {
                  id: 1,
                  description: 'Matemática',
                  questions: exam.numQuestions,
                  answered: exam.answeredCount,
                  correct: exam.correctCount,
                  accuracy: exam.accuracy,
                },
              ]
            : [],
        });
        if (examMatch[2] === 'finish') {
          state.finishCalls++;
          exam.finishedAt = apiDate();
          exam.answeredCount = state.links.filter((link) => link.answerOption).length;
          exam.correctCount = state.links.filter((link) => link.correct).length;
          exam.accuracy = (exam.correctCount / exam.numQuestions) * 100;
          return respond(result());
        }
        if (examMatch[2] === 'result') return respond(result());
        return respond(exam);
      }
      if (path.startsWith('/performance/me/')) {
        const finished = state.exams.filter((exam) => exam.finishedAt);
        const answered = finished.reduce((sum, exam) => sum + (exam.answeredCount ?? 0), 0);
        const correct = finished.reduce((sum, exam) => sum + (exam.correctCount ?? 0), 0);
        const total = finished.reduce((sum, exam) => sum + exam.numQuestions, 0);
        if (path.endsWith('/overview'))
          return respond({
            finishedMockExams: finished.length,
            questions: total,
            answered,
            correct,
            accuracy: total ? (correct / total) * 100 : null,
            averageDurationMinutes: finished.length ? 43 : null,
          });
        if (path.endsWith('/evolution'))
          return respond(
            finished
              .slice()
              .reverse()
              .map((exam) => ({
                mockExamId: exam.id,
                mockExamName: exam.name,
                finishedAt: exam.finishedAt,
                questions: exam.numQuestions,
                answered: exam.answeredCount,
                correct: exam.correctCount,
                accuracy: exam.accuracy,
              })),
          );
        if (path.endsWith('/weak-topics'))
          return respond(
            finished.length
              ? [
                  {
                    id: 1,
                    description: 'Aritmética',
                    questions: 12,
                    answered: 12,
                    correct: 5,
                    accuracy: 41.67,
                  },
                ]
              : [],
          );
        return respond(
          finished.length
            ? [
                {
                  id: 1,
                  description: 'Matemática',
                  questions: 20,
                  answered: 20,
                  correct: 9,
                  accuracy: 45,
                },
                {
                  id: 2,
                  description: 'Biologia',
                  questions: 15,
                  answered: 15,
                  correct: 9,
                  accuracy: 60,
                },
              ]
            : [],
        );
      }
      return respond({ message: `Endpoint não simulado: ${method} ${path}` }, 501);
    },
  );
  return state;
}
