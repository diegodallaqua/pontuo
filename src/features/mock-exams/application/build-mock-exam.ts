import type { QuestionFilter } from '../../catalog/domain/catalog';
import type { MockExamBuilderGateway, MockExamInput } from '../domain/mock-exam';

export class IncompleteMockExamError extends Error {
  constructor(
    readonly mockExamId: number,
    options?: ErrorOptions,
  ) {
    super(
      'A montagem foi interrompida e a limpeza não pôde ser confirmada. Exclua o simulado incompleto no histórico antes de criar outro.',
      options,
    );
    this.name = 'IncompleteMockExamError';
  }
}

export async function buildMockExam(
  gateway: MockExamBuilderGateway,
  input: MockExamInput,
  filter: QuestionFilter,
) {
  if (!input.name.trim() || input.name.trim().length > 150)
    throw new Error('Informe um nome com até 150 caracteres.');
  if (!Number.isInteger(input.numQuestions) || input.numQuestions < 1 || input.numQuestions > 100)
    throw new Error('Escolha entre 1 e 100 questões.');
  if (!Number.isInteger(input.maxTime) || input.maxTime < 1 || input.maxTime > 32767)
    throw new Error('Informe um tempo válido em minutos.');
  const questions = await gateway.draw(filter, input.numQuestions);
  if (!questions.length)
    throw new Error('Nenhuma questão encontrada. Experimente ampliar os filtros.');
  if (questions.some((question) => question.answerOptions.length < 2))
    throw new Error(
      'Há questões sem alternativas suficientes neste recorte. Escolha outros filtros.',
    );
  const mockExam = await gateway.create({
    ...input,
    name: input.name.trim(),
    numQuestions: questions.length,
  });
  try {
    // Sequencial: o id do vínculo é a ordem estável ao retomar a prova.
    for (const question of questions) await gateway.link(mockExam.id, question);
  } catch (error) {
    try {
      await gateway.remove(mockExam.id);
    } catch {
      throw new IncompleteMockExamError(mockExam.id, { cause: error });
    }
    throw new Error(
      'Não foi possível montar todas as questões. O simulado incompleto foi removido; tente novamente.',
      { cause: error },
    );
  }
  return { mockExam, requestedCount: input.numQuestions };
}
