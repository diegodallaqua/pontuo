import { describe, expect, it, vi } from 'vitest';
import { createMockExamApi } from './mock-exam-api';
import type { HttpClient } from '../../../shared/lib/http';

const page = <T>(content: T[]) => ({ content, page: 1, last: true });

describe('adaptação da sessão', () => {
  it('remove gabarito e explicação e ordena questões por vínculo e alternativas por letra', async () => {
    const question = {
      id: 1,
      statement: 'Pergunta',
      difficulty: 1,
      subject: null,
      topic: null,
      entranceExam: null,
      explanation: 'SEGREDO',
    };
    const http = vi.fn<HttpClient>().mockImplementation(async (path: string) => {
      if (path === '/mock-exams/8') return { id: 8, finishedAt: null };
      if (path === '/mock-exam-questions')
        return page([
          { id: 3, question, correct: true, answerOption: { id: 10 } },
          { id: 1, question: { ...question, id: 2 }, correct: false, answerOption: null },
        ]);
      if (path === '/answer-options')
        return page([
          { id: 11, letter: 'B', text: 'B', rightAnswer: false, question },
          { id: 10, letter: 'A', text: 'A', rightAnswer: true, question },
        ]);
      if (path === '/question-images') return page([]);
      throw new Error(`Rota não prevista: ${path}`);
    }) as HttpClient;
    const session = await createMockExamApi(http).loadSession(8);
    expect(session.questions.map((item) => item.id)).toEqual([1, 3]);
    expect(session.questions[1]?.answerOptionId).toBe(10);
    const json = JSON.stringify(session);
    expect(json).not.toContain('rightAnswer');
    expect(json).not.toContain('correct');
    expect(json).not.toContain('explanation');
    expect(json).not.toContain('SEGREDO');
    expect(session.questions[0]?.question.answerOptions.map((item) => item.letter)).toEqual([
      'A',
      'B',
    ]);
  });
  it('envia a busca do histórico à API e devolve os mais recentes primeiro', async () => {
    const http = vi.fn<HttpClient>().mockResolvedValue(page([{ id: 4 }, { id: 9 }])) as HttpClient;
    const exams = await createMockExamApi(http).list({ userId: 7, search: 'enem' });
    expect(exams.map((exam) => exam.id)).toEqual([9, 4]);
    expect(http).toHaveBeenCalledWith('/mock-exams', {
      query: { userId: 7, search: 'enem', page: 1, limit: 100 },
      signal: undefined,
    });
  });
  it('compartilha uma finalização em andamento do mesmo simulado', async () => {
    const http = vi.fn<HttpClient>().mockResolvedValue({ mockExam: { id: 5 } }) as HttpClient;
    const api = createMockExamApi(http);
    const [first, second] = await Promise.all([api.finish(5), api.finish(5)]);
    expect(first).toBe(second);
    expect(http).toHaveBeenCalledOnce();
    await api.finish(5);
    expect(http).toHaveBeenCalledTimes(2);
  });
  it('monta a revisão com imagens e gabarito dentro da questão', async () => {
    const http = vi.fn<HttpClient>().mockResolvedValue([
      {
        id: 3,
        answeredAt: null,
        correct: null,
        selectedAnswerOptionId: null,
        question: { id: 1, statement: 'Pergunta', explanation: 'Porque sim.' },
        images: [{ id: 7, url: '/a.png', subtitle: null }],
        answerOptions: [{ id: 10, letter: 'A', text: '4', rightAnswer: true }],
      },
    ]) as HttpClient;
    const [item] = await createMockExamApi(http).review(8);
    expect(http).toHaveBeenCalledWith('/mock-exams/8/review', { signal: undefined });
    expect(item).toEqual({
      id: 3,
      correct: null,
      selectedAnswerOptionId: null,
      question: {
        id: 1,
        statement: 'Pergunta',
        explanation: 'Porque sim.',
        images: [{ id: 7, url: '/a.png', subtitle: null }],
        answerOptions: [{ id: 10, letter: 'A', text: '4', rightAnswer: true }],
      },
    });
  });
});
