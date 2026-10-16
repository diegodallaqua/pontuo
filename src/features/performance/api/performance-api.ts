import type { HttpClient } from '../../../shared/lib/http';
import type {
  EvolutionPoint,
  PerformanceFilter,
  PerformanceItem,
  PerformanceOverview,
} from '../domain/performance';

export function createPerformanceApi(http: HttpClient) {
  return {
    overview: (filter: PerformanceFilter = {}, signal?: AbortSignal) =>
      http<PerformanceOverview>('/performance/me/overview', {
        query: { from: filter.from, to: filter.to },
        signal,
      }),
    evolution: (filter: PerformanceFilter = {}, signal?: AbortSignal) =>
      http<EvolutionPoint[]>('/performance/me/evolution', {
        query: { from: filter.from, to: filter.to, subjectId: filter.subjectId },
        signal,
      }),
    breakdown: (
      kind: 'knowledge-areas' | 'subjects' | 'topics' | 'difficulty' | 'weak-topics',
      filter: PerformanceFilter = {},
      signal?: AbortSignal,
    ) =>
      http<PerformanceItem[]>(`/performance/me/${kind}`, {
        query: {
          from: filter.from,
          to: filter.to,
          entranceExamId: filter.entranceExamId,
          ...(kind === 'subjects' ? { knowledgeAreaId: filter.knowledgeAreaId } : {}),
          ...(kind === 'topics' ? { subjectId: filter.subjectId } : {}),
          ...(kind === 'weak-topics' ? { minQuestions: 5, limit: 5 } : {}),
        },
        signal,
      }),
  };
}
