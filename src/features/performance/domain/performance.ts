export interface PerformanceOverview {
  finishedMockExams: number;
  questions: number;
  answered: number;
  correct: number;
  accuracy: number | null;
  averageDurationMinutes: number | null;
}
export interface PerformanceItem {
  id: number;
  description: string | null;
  questions: number;
  answered: number;
  correct: number;
  accuracy: number;
}
export interface EvolutionPoint {
  mockExamId: number;
  mockExamName: string;
  finishedAt: string;
  questions: number;
  answered: number;
  correct: number;
  accuracy: number;
}
export interface PerformanceFilter {
  from?: string;
  to?: string;
  entranceExamId?: number;
  knowledgeAreaId?: number;
  subjectId?: number;
}
export const MIN_INSIGHT_QUESTIONS = 5;
export function weakestSubjects(items: PerformanceItem[], limit = 3): PerformanceItem[] {
  return items
    .filter((item) => item.questions >= MIN_INSIGHT_QUESTIONS && item.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy || b.questions - a.questions)
    .slice(0, limit);
}
