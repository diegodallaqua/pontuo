import { parseApiDate } from '../../../shared/lib/date';
import type { AnswerOption, Question, QuestionFilter } from '../../catalog/domain/catalog';
import type { PerformanceItem } from '../../performance/domain/performance';

export interface MockExam {
  id: number;
  name: string;
  numQuestions: number;
  maxTime: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  answeredCount: number | null;
  correctCount: number | null;
  accuracy: number | null;
}
export interface MockExamInput {
  name: string;
  numQuestions: number;
  maxTime: number;
}
export interface SessionQuestion {
  id: number;
  question: Question;
  answerOptionId: number | null;
}
export interface MockExamSession {
  mockExam: MockExam;
  questions: SessionQuestion[];
}
export interface MockExamResult {
  mockExam: MockExam;
  subjects: PerformanceItem[];
}
// Revisão de simulado finalizado: só aqui o gabarito e a resolução chegam ao estudante.
export interface ReviewOption extends AnswerOption {
  rightAnswer: boolean;
}
export interface ReviewQuestion extends Omit<Question, 'answerOptions'> {
  explanation: string | null;
  answerOptions: ReviewOption[];
}
export interface ReviewItem {
  id: number;
  correct: boolean | null;
  selectedAnswerOptionId: number | null;
  question: ReviewQuestion;
}
export type ReviewOutcome = 'correct' | 'incorrect' | 'blank';
export function reviewOutcome(item: ReviewItem): ReviewOutcome {
  return item.selectedAnswerOptionId === null ? 'blank' : item.correct ? 'correct' : 'incorrect';
}
export function selectedOption(item: ReviewItem): ReviewOption | null {
  return (
    item.question.answerOptions.find((option) => option.id === item.selectedAnswerOptionId) ?? null
  );
}
// `correct` foi congelado na finalização; `rightAnswer` é o gabarito atual. Divergem quando o
// gabarito foi corrigido depois da prova, e a nota continua valendo a correção da época.
export function answerKeyChanged(item: ReviewItem): boolean {
  const selected = selectedOption(item);
  return selected !== null && selected.rightAnswer !== item.correct;
}

// Prazo em epoch ms: startedAt + maxTime, no offset configurado para a JVM.
export function mockExamDeadline(mockExam: MockExam): number | null {
  return mockExam.startedAt
    ? parseApiDate(mockExam.startedAt).getTime() + mockExam.maxTime * 60_000
    : null;
}
// `expired`: o prazo acabou, mas ninguém chamou /finish ainda. A API não finaliza sozinha,
// então o boletim só existe depois que o cliente finaliza.
export type MockExamStatus = 'ready' | 'active' | 'expired' | 'finished';
export function mockExamStatus(mockExam: MockExam, now = Date.now()): MockExamStatus {
  if (mockExam.finishedAt) return 'finished';
  const deadline = mockExamDeadline(mockExam);
  if (deadline === null) return 'ready';
  return now >= deadline ? 'expired' : 'active';
}
// Simulados encerrados abrem o resultado; os demais, a execução.
export function isOver(status: MockExamStatus) {
  return status === 'finished' || status === 'expired';
}
export const statusLabels: Record<MockExamStatus, string> = {
  ready: 'Pronto para começar',
  active: 'Em andamento',
  expired: 'Tempo esgotado',
  finished: 'Finalizado',
};

// Porta pequena para o caso de uso com múltiplas operações e compensação.
export interface MockExamBuilderGateway {
  draw(filter: QuestionFilter, size: number): Promise<Question[]>;
  create(input: MockExamInput): Promise<MockExam>;
  link(mockExamId: number, question: Question): Promise<SessionQuestion>;
  remove(id: number): Promise<void>;
}
