import { describe, expect, it, vi } from 'vitest';
import {
  AnswerKeyLostError,
  saveAnswerOption,
  type AnswerOptionGateway,
} from './save-answer-option';
import type { AnswerKeyOption } from '../domain/admin';

const options: AnswerKeyOption[] = [
  { id: 1, letter: 'A', text: '4', rightAnswer: true },
  { id: 2, letter: 'B', text: '5', rightAnswer: false },
];
function gateway(failures: { update?: number[]; create?: boolean } = {}) {
  const calls: string[] = [];
  const fake: AnswerOptionGateway = {
    create: vi.fn(async (body) => {
      calls.push(`create ${body.letter} ${body.rightAnswer}`);
      if (failures.create) throw new Error('recusada');
      return { id: 3, ...body };
    }),
    update: vi.fn(async (id, body) => {
      calls.push(`update ${id} ${body.rightAnswer}`);
      if (failures.update?.includes(calls.length)) throw new Error('recusada');
      return { id, ...body };
    }),
  };
  return { fake, calls };
}

describe('gabarito das alternativas', () => {
  it('desmarca a correta anterior antes de marcar outra', async () => {
    const { fake, calls } = gateway();
    await saveAnswerOption(
      fake,
      options,
      { questionId: 9, letter: 'B', text: '5', rightAnswer: true },
      options[1]!,
    );
    expect(calls).toEqual(['update 1 false', 'update 2 true']);
  });
  it('não toca nas outras alternativas quando a correta continua a mesma', async () => {
    const { fake, calls } = gateway();
    await saveAnswerOption(
      fake,
      options,
      { questionId: 9, letter: 'A', text: 'quatro', rightAnswer: true },
      options[0]!,
    );
    expect(calls).toEqual(['update 1 true']);
  });
  it('restaura a correta anterior se a nova alternativa for recusada', async () => {
    const { fake, calls } = gateway({ create: true });
    await expect(
      saveAnswerOption(
        fake,
        options,
        { questionId: 9, letter: 'C', text: '6', rightAnswer: true },
        null,
      ),
    ).rejects.toThrow('recusada');
    expect(calls).toEqual(['update 1 false', 'create C true', 'update 1 true']);
  });
  it('informa a letra quando nem a restauração é confirmada', async () => {
    const { fake } = gateway({ update: [2, 3] });
    const failure = saveAnswerOption(
      fake,
      options,
      { questionId: 9, letter: 'B', text: '5', rightAnswer: true },
      options[1]!,
    );
    await expect(failure).rejects.toBeInstanceOf(AnswerKeyLostError);
    await expect(failure).rejects.toMatchObject({ letter: 'A' });
  });
});
