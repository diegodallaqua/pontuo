import type { HttpClient } from '../../../shared/lib/http';
import { listAll, type Page } from '../../../shared/lib/pagination';
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
        listAll<KnowledgeArea>(http, '/knowledge-areas', {}, signal),
        listAll<Subject>(http, '/subjects', {}, signal),
        listAll<Topic>(http, '/topics', {}, signal),
        listAll<EntranceExam>(http, '/entrance-exams', {}, signal),
      ]);
      return { knowledgeAreas, subjects, topics, entranceExams };
    },
    // Uma página de um registro basta: o total vem no envelope.
    async count(filter: QuestionFilter, signal?: AbortSignal): Promise<number> {
      const page = await http<Page<unknown>>('/questions', {
        query: { ...filter, page: 1, limit: 1 },
        signal,
      });
      return page.totalElements;
    },
  };
}
