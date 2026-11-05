import { ApiError } from '../../../shared/lib/http';
import { mockExamStatus, type MockExamResult, type ReviewItem } from '../domain/mock-exam';

export interface ResultGateway {
  result(id: number, signal?: AbortSignal): Promise<MockExamResult>;
  finish(id: number): Promise<MockExamResult>;
}
export interface ReviewGateway extends ResultGateway {
  review(id: number, signal?: AbortSignal): Promise<ReviewItem[]>;
}

// A API só grava finishedAt quando alguém chama /finish: com a aba fechada, um simulado
// vencido continua aberto. Resultado e revisão finalizam antes de abrir, e a API registra
// finishedAt no horário limite. Simulados ainda dentro do prazo voltam sem finalizar.
export async function loadResult(
  gateway: ResultGateway,
  id: number,
  signal?: AbortSignal,
  now = Date.now(),
): Promise<MockExamResult> {
  const result = await gateway.result(id, signal);
  if (mockExamStatus(result.mockExam, now) !== 'expired') return result;
  try {
    return await gateway.finish(id);
  } catch (error) {
    // Outra aba finalizou primeiro: o boletim já existe no servidor.
    if (error instanceof ApiError && error.status === 409) return gateway.result(id, signal);
    throw error;
  }
}
// A revisão só existe depois da finalização: dentro do prazo, devolve o resultado sem pedi-la.
export async function loadReview(
  gateway: ReviewGateway,
  id: number,
  signal?: AbortSignal,
  now = Date.now(),
): Promise<MockExamResult & { questions: ReviewItem[] }> {
  const result = await loadResult(gateway, id, signal, now);
  const questions = result.mockExam.finishedAt ? await gateway.review(id, signal) : [];
  return { ...result, questions };
}
