import type { HttpClient } from '../../../shared/lib/http';
import type {
  AnswerOption,
  Question,
  QuestionFilter,
  QuestionImage,
} from '../../catalog/domain/catalog';
import type {
  AnswerResult,
  MockExam,
  MockExamInput,
  MockExamResult,
  MockExamSession,
  SessionQuestion,
} from '../domain/mock-exam';

type QuestionDto = Omit<Question, 'answerOptions' | 'images'>;
interface LinkDto {
  id: number;
  question: QuestionDto;
  answerOption: AnswerOption | null;
  correct: boolean | null;
}
function sessionQuestion(link: LinkDto, question: Question): SessionQuestion {
  return { id: link.id, question, answerOptionId: link.answerOption?.id ?? null };
}
function safeQuestion(
  question: QuestionDto,
  answerOptions: AnswerOption[],
  images: QuestionImage[],
): Question {
  // Projeção explícita: explanation/rightAnswer/correct nunca entram na sessão da prova.
  return {
    id: question.id,
    statement: question.statement,
    difficulty: question.difficulty,
    entranceExam: question.entranceExam,
    subject: question.subject,
    topic: question.topic,
    answerOptions: answerOptions
      .map(({ id, letter, text }) => ({ id, letter, text }))
      .sort((a, b) => a.letter.localeCompare(b.letter)),
    images: images.map(({ id, url, subtitle }) => ({ id, url, subtitle })),
  };
}

export function createMockExamApi(http: HttpClient) {
  // Cache de conteúdo público autenticado, limitado ao último sorteio; nunca guarda respostas.
  const questionCache = new Map<number, Question>();
  return {
    list: (userId: number, signal?: AbortSignal) =>
      http<MockExam[]>('/mock-exams', { query: { userId }, signal }),
    get: (id: number, signal?: AbortSignal) => http<MockExam>(`/mock-exams/${id}`, { signal }),
    create: (body: MockExamInput) => http<MockExam>('/mock-exams', { method: 'POST', body }),
    update: (id: number, body: MockExamInput) =>
      http<MockExam>(`/mock-exams/${id}`, { method: 'PUT', body }),
    remove: (id: number) => http<void>(`/mock-exams/${id}`, { method: 'DELETE' }),
    start: (id: number) => http<MockExam>(`/mock-exams/${id}/start`, { method: 'POST' }),
    finish: (id: number) => http<MockExamResult>(`/mock-exams/${id}/finish`, { method: 'POST' }),
    result: (id: number, signal?: AbortSignal) =>
      http<MockExamResult>(`/mock-exams/${id}/result`, { signal }),
    async draw(filter: QuestionFilter, size: number): Promise<Question[]> {
      const questions = await http<Question[]>('/questions/draw', { query: { ...filter, size } });
      questionCache.clear();
      return questions.map((dto) => {
        const question = safeQuestion(dto, dto.answerOptions, dto.images);
        questionCache.set(question.id, question);
        return question;
      });
    },
    async link(mockExamId: number, question: Question): Promise<SessionQuestion> {
      const dto = await http<LinkDto>('/mock-exam-questions', {
        method: 'POST',
        body: { mockExamId, questionId: question.id, answerOptionId: null },
      });
      return sessionQuestion(dto, question);
    },
    async saveAnswer(
      mockExamId: number,
      link: SessionQuestion,
      answerOptionId: number | null,
    ): Promise<SessionQuestion> {
      const dto = await http<LinkDto>(`/mock-exam-questions/${link.id}`, {
        method: 'PUT',
        body: { mockExamId, questionId: link.question.id, answerOptionId },
      });
      return sessionQuestion(dto, link.question);
    },
    async loadSession(id: number, signal?: AbortSignal): Promise<MockExamSession> {
      const [mockExam, links] = await Promise.all([
        http<MockExam>(`/mock-exams/${id}`, { signal }),
        http<LinkDto[]>('/mock-exam-questions', { query: { mockExamId: id }, signal }),
      ]);
      if (mockExam.finishedAt) return { mockExam, questions: [] };
      const ordered = [...links].sort((a, b) => a.id - b.id);
      const questions: SessionQuestion[] = [];
      // No máximo 4 questões (8 GETs) em voo ao recarregar, em vez de 200 requisições simultâneas.
      for (let index = 0; index < ordered.length; index += 4) {
        questions.push(
          ...(await Promise.all(
            ordered.slice(index, index + 4).map(async (link) => {
              const cached = questionCache.get(link.question.id);
              if (cached) return sessionQuestion(link, cached);
              const query = { questionId: link.question.id };
              const [options, images] = await Promise.all([
                http<AnswerOption[]>('/answer-options', { query, signal }),
                http<QuestionImage[]>('/question-images', { query, signal }),
              ]);
              return sessionQuestion(link, safeQuestion(link.question, options, images));
            }),
          )),
        );
      }
      return { mockExam, questions };
    },
    async answerResults(id: number, signal?: AbortSignal): Promise<AnswerResult[]> {
      const links = await http<LinkDto[]>('/mock-exam-questions', {
        query: { mockExamId: id },
        signal,
      });
      return [...links]
        .sort((a, b) => a.id - b.id)
        .map((link) => ({
          id: link.id,
          questionId: link.question.id,
          answerLetter: link.answerOption?.letter ?? null,
          correct: link.correct,
        }));
    },
  };
}
