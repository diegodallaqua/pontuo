import type { HttpClient } from '../../../shared/lib/http';
import type {
  Catalog,
  KnowledgeArea,
  Subject,
  Topic,
  EntranceExam,
  QuestionFilter,
} from '../domain/catalog';

export function createCatalogApi(http: HttpClient) {
  return {
    async load(signal?: AbortSignal): Promise<Catalog> {
      const [knowledgeAreas, subjects, topics, entranceExams] = await Promise.all([
        http<KnowledgeArea[]>('/knowledge-areas', { signal }),
        http<Subject[]>('/subjects', { signal }),
        http<Topic[]>('/topics', { signal }),
        http<EntranceExam[]>('/entrance-exams', { signal }),
      ]);
      return { knowledgeAreas, subjects, topics, entranceExams };
    },
    async count(filter: QuestionFilter, signal?: AbortSignal): Promise<number> {
      const page = await http<{ totalElements: number }>('/questions', {
        query: { ...filter, page: 0, size: 1 },
        signal,
      });
      return page.totalElements;
    },
  };
}
