import { describe, expect, it, vi } from 'vitest';
import { buildMockExam, IncompleteMockExamError } from './build-mock-exam';
import type { MockExam, MockExamBuilderGateway, MockExamInput } from '../domain/mock-exam';
import type { Question } from '../../catalog/domain/catalog';

const input: MockExamInput = { name: '  Meu treino  ', numQuestions: 10, maxTime: 30 };
const exam = { id: 42, ...input } as MockExam;
const question = (id: number): Question => ({
  id,
  statement: 'Questão',
  difficulty: 1,
  entranceExam: null,
  subject: null,
  topic: null,
  images: [],
  answerOptions: [
    { id: 1, letter: 'A', text: 'Um' },
    { id: 2, letter: 'B', text: 'Dois' },
  ],
});
function gateway(questions = [question(1), question(2)]) {
  return {
    draw: vi.fn<MockExamBuilderGateway['draw']>().mockResolvedValue(questions),
    create: vi.fn<MockExamBuilderGateway['create']>().mockResolvedValue(exam),
    link: vi.fn<MockExamBuilderGateway['link']>().mockImplementation(async (_, item) => ({
      id: item.id,
      question: item,
      answerOptionId: null,
    })),
    remove: vi.fn<MockExamBuilderGateway['remove']>().mockResolvedValue(undefined),
  };
}
describe('montagem de um simulado', () => {
  it('combina filtros, usa a quantidade real sorteada e mantém a ordem dos vínculos', async () => {
    const api = gateway();
    const result = await buildMockExam(api, input, { subjectId: 3, difficulty: 2 });
    expect(api.draw).toHaveBeenCalledWith({ subjectId: 3, difficulty: 2 }, 10);
    expect(api.create).toHaveBeenCalledWith({ name: 'Meu treino', numQuestions: 2, maxTime: 30 });
    expect(api.link.mock.calls.map((call) => call[1].id)).toEqual([1, 2]);
    expect(result.requestedCount).toBe(10);
  });
  it('não cria registros quando o sorteio fica vazio', async () => {
    const api = gateway([]);
    await expect(buildMockExam(api, input, {})).rejects.toThrow('Nenhuma questão');
    expect(api.create).not.toHaveBeenCalled();
  });
  it('recusa questões sem alternativas antes de criar o simulado', async () => {
    const api = gateway([{ ...question(1), answerOptions: [] }]);
    await expect(buildMockExam(api, input, {})).rejects.toThrow('alternativas');
    expect(api.create).not.toHaveBeenCalled();
  });
  it('remove o simulado se um vínculo falhar', async () => {
    const api = gateway();
    api.link.mockRejectedValueOnce(new Error('Sem conexão'));
    await expect(buildMockExam(api, input, {})).rejects.toThrow('foi removido');
    expect(api.remove).toHaveBeenCalledWith(42);
    expect(api.link).toHaveBeenCalledTimes(1);
  });
  it('informa o id para recuperação quando a compensação também falha', async () => {
    const api = gateway();
    api.link.mockRejectedValueOnce(new Error('Sem conexão'));
    api.remove.mockRejectedValueOnce(new Error('Sem conexão'));
    const failure = await buildMockExam(api, input, {}).catch((error) => error);
    expect(failure).toBeInstanceOf(IncompleteMockExamError);
    expect(failure.mockExamId).toBe(42);
  });
  it.each([0, -1, 101, 2.5])(
    'rejeita quantidade inválida %s sem enviar requisições',
    async (numQuestions) => {
      const api = gateway();
      await expect(buildMockExam(api, { ...input, numQuestions }, {})).rejects.toThrow('1 e 100');
      expect(api.draw).not.toHaveBeenCalled();
    },
  );
  it('não tenta remover um id desconhecido quando a criação falha', async () => {
    const api = gateway();
    api.create.mockRejectedValue(new Error('Servidor indisponível'));
    await expect(buildMockExam(api, input, {})).rejects.toThrow('Servidor indisponível');
    expect(api.remove).not.toHaveBeenCalled();
  });
});
