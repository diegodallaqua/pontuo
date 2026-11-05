import { describe, expect, it } from 'vitest';
import { answerKeyChanged, reviewOutcome, type ReviewItem } from './mock-exam';

function item(patch: Partial<ReviewItem>): ReviewItem {
  return {
    id: 1,
    correct: null,
    selectedAnswerOptionId: null,
    question: {
      id: 9,
      statement: 'Quanto é 2 + 2?',
      explanation: null,
      difficulty: 1,
      entranceExam: null,
      subject: null,
      topic: null,
      images: [],
      answerOptions: [
        { id: 10, letter: 'A', text: '4', rightAnswer: true },
        { id: 11, letter: 'B', text: '5', rightAnswer: false },
      ],
    },
    ...patch,
  };
}

describe('revisão do simulado', () => {
  it('classifica a resposta pela correção gravada na finalização', () => {
    expect(reviewOutcome(item({}))).toBe('blank');
    expect(reviewOutcome(item({ selectedAnswerOptionId: 10, correct: true }))).toBe('correct');
    expect(reviewOutcome(item({ selectedAnswerOptionId: 11, correct: false }))).toBe('incorrect');
  });
  it('aponta gabarito corrigido depois da prova', () => {
    expect(answerKeyChanged(item({ selectedAnswerOptionId: 10, correct: true }))).toBe(false);
    expect(answerKeyChanged(item({ selectedAnswerOptionId: 11, correct: true }))).toBe(true);
    expect(answerKeyChanged(item({}))).toBe(false);
  });
});
