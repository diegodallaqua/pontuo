import { describe, expect, it, vi } from 'vitest';
import { createMockExamApi } from './mock-exam-api';
import type { HttpClient } from '../../../shared/lib/http';

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
        return [
          { id: 3, question, correct: true, answerOption: { id: 10 } },
          { id: 1, question: { ...question, id: 2 }, correct: false, answerOption: null },
        ];
      if (path === '/answer-options')
        return [
          { id: 11, letter: 'B', text: 'B', rightAnswer: false, question },
          { id: 10, letter: 'A', text: 'A', rightAnswer: true, question },
        ];
      if (path === '/question-images') return [];
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
});
