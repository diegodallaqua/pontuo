import { describe, expect, it, vi } from 'vitest';
import { loadResult, loadReview, type ResultGateway } from './load-result';
import { ApiError } from '../../../shared/lib/http';
import type { MockExam } from '../domain/mock-exam';

const NOW = Date.parse('2026-11-04T15:00:00Z');
const exam: MockExam = {
  id: 5,
  name: 'Treino',
  numQuestions: 2,
  maxTime: 30,
  createdAt: '2026-11-04T11:00:00',
  // 11:00 em -03:00 = 14:00 UTC; prazo às 14:30 UTC.
  startedAt: '2026-11-04T11:00:00',
  finishedAt: null,
  answeredCount: null,
  correctCount: null,
  accuracy: null,
};
const finished = { ...exam, finishedAt: '2026-11-04T11:30:00', correctCount: 1, accuracy: 50 };

function gateway(
  mockExam: MockExam,
  finish: ResultGateway['finish'] = async () => ({
    mockExam: finished,
    subjects: [],
  }),
) {
  return {
    result: vi.fn(async () => ({ mockExam, subjects: [] })),
    finish: vi.fn(finish),
  };
}

describe('abertura do resultado', () => {
  it('finaliza o simulado vencido antes de devolver o boletim', async () => {
    const fake = gateway(exam);
    await expect(loadResult(fake, 5, undefined, NOW)).resolves.toMatchObject({
      mockExam: { finishedAt: '2026-11-04T11:30:00' },
    });
    expect(fake.finish).toHaveBeenCalledWith(5);
  });
  it('não finaliza simulado dentro do prazo nem o já finalizado', async () => {
    const active = gateway(exam);
    await loadResult(active, 5, undefined, Date.parse('2026-11-04T14:10:00Z'));
    const done = gateway(finished);
    await loadResult(done, 5, undefined, NOW);
    expect(active.finish).not.toHaveBeenCalled();
    expect(done.finish).not.toHaveBeenCalled();
  });
  it('relê o boletim quando outra aba finalizou primeiro', async () => {
    const fake = gateway(exam, async () => {
      throw new ApiError('simulado já finalizado', 409);
    });
    fake.result.mockResolvedValueOnce({ mockExam: exam, subjects: [] });
    fake.result.mockResolvedValueOnce({ mockExam: finished, subjects: [] });
    await expect(loadResult(fake, 5, undefined, NOW)).resolves.toMatchObject({
      mockExam: { accuracy: 50 },
    });
    expect(fake.result).toHaveBeenCalledTimes(2);
  });
  it('propaga outras falhas da finalização', async () => {
    const fake = gateway(exam, async () => {
      throw new ApiError('Indisponível', 503);
    });
    await expect(loadResult(fake, 5, undefined, NOW)).rejects.toMatchObject({ status: 503 });
  });
  it('pede a revisão só depois da finalização', async () => {
    const review = vi.fn(async () => []);
    const active = { ...gateway(exam), review };
    await expect(
      loadReview(active, 5, undefined, Date.parse('2026-11-04T14:10:00Z')),
    ).resolves.toMatchObject({ questions: [] });
    expect(review).not.toHaveBeenCalled();
    const expired = { ...gateway(exam), review };
    await loadReview(expired, 5, undefined, NOW);
    expect(expired.finish).toHaveBeenCalledBefore(review);
  });
});
