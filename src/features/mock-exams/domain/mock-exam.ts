import type { Question, QuestionFilter } from '../../catalog/domain/catalog';
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
export interface AnswerResult {
  id: number;
  questionId: number;
  answerLetter: string | null;
  correct: boolean | null;
}

export type MockExamStatus = 'ready' | 'active' | 'finished';
export function mockExamStatus(mockExam: MockExam): MockExamStatus {
  return mockExam.finishedAt ? 'finished' : mockExam.startedAt ? 'active' : 'ready';
}
export const statusLabels: Record<MockExamStatus, string> = {
  ready: 'Pronto para começar',
  active: 'Em andamento',
  finished: 'Finalizado',
};

// Porta pequena para o caso de uso com múltiplas operações e compensação.
export interface MockExamBuilderGateway {
  draw(filter: QuestionFilter, size: number): Promise<Question[]>;
  create(input: MockExamInput): Promise<MockExam>;
  link(mockExamId: number, question: Question): Promise<SessionQuestion>;
  remove(id: number): Promise<void>;
}
