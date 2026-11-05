import type { AnswerKeyOption, AnswerOptionInput } from '../domain/admin';

export interface AnswerOptionGateway {
  create(body: AnswerOptionInput): Promise<AnswerKeyOption>;
  update(id: number, body: AnswerOptionInput): Promise<AnswerKeyOption>;
}
export class AnswerKeyLostError extends Error {
  constructor(readonly letter: string) {
    super(
      `A alternativa ${letter} deixou de ser a correta e não foi possível restaurá-la. Marque a alternativa correta novamente.`,
    );
    this.name = 'AnswerKeyLostError';
  }
}

// A API aceita uma única alternativa correta por questão. Para transferir o gabarito,
// desmarca a atual antes e a restaura se a gravação da nova falhar.
export async function saveAnswerOption(
  gateway: AnswerOptionGateway,
  options: AnswerKeyOption[],
  input: AnswerOptionInput,
  current: AnswerKeyOption | null,
): Promise<AnswerKeyOption> {
  const previous = input.rightAnswer
    ? options.find((option) => option.rightAnswer && option.id !== current?.id)
    : undefined;
  const mark = (option: AnswerKeyOption, rightAnswer: boolean) =>
    gateway.update(option.id, {
      questionId: input.questionId,
      letter: option.letter,
      text: option.text,
      rightAnswer,
    });
  if (previous) await mark(previous, false);
  try {
    return await (current ? gateway.update(current.id, input) : gateway.create(input));
  } catch (error) {
    if (!previous) throw error;
    try {
      await mark(previous, true);
    } catch {
      throw new AnswerKeyLostError(previous.letter);
    }
    throw error;
  }
}
