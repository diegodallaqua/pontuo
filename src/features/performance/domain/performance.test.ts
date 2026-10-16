import { describe, expect, it } from 'vitest';
import { weakestSubjects, type PerformanceItem } from './performance';

const item = (id: number, accuracy: number, questions: number): PerformanceItem => ({
  id,
  description: 'Disciplina',
  accuracy,
  questions,
  answered: questions,
  correct: 0,
});
describe('prioridades de estudo', () => {
  it('não aponta dificuldades com amostras pequenas ou aproveitamento >= 70%', () => {
    expect(weakestSubjects([item(1, 0, 4), item(2, 70, 20), item(3, 40, 5)])).toEqual([
      item(3, 40, 5),
    ]);
  });
  it('ordena os menores aproveitamentos, desempata pela amostra e respeita o limite sem mutação', () => {
    const source = [item(1, 60, 5), item(2, 20, 5), item(3, 20, 8), item(4, 50, 5)];
    expect(weakestSubjects(source, 2).map((value) => value.id)).toEqual([3, 2]);
    expect(source.map((value) => value.id)).toEqual([1, 2, 3, 4]);
  });
});
