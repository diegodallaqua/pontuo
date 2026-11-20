import type { HttpClient, Query } from '../../../shared/lib/http';
import { listAll, type Page } from '../../../shared/lib/pagination';
import type { KnowledgeArea, QuestionImage, Subject, Topic } from '../../catalog/domain/catalog';
import type {
  Address,
  AddressInput,
  AdminEntranceExam,
  AdminQuestion,
  AnswerKeyOption,
  AnswerOptionInput,
  City,
  EntranceExamInput,
  Institution,
  InstitutionInput,
  KnowledgeAreaInput,
  QuestionImageInput,
  QuestionImageUpload,
  QuestionImageUploadInput,
  QuestionInput,
  State,
  SubjectInput,
  TopicInput,
} from '../domain/admin';

// Todos os recursos seguem o mesmo CRUD REST da API; só mudam rota, resposta e corpo.
function resource<T, Input>(http: HttpClient, path: string) {
  const create = (body: Input) => http<T>(path, { method: 'POST', body });
  const update = (id: number, body: Input) => http<T>(`${path}/${id}`, { method: 'PUT', body });
  return {
    list: (query: Query, signal?: AbortSignal) => http<Page<T>>(path, { query, signal }),
    all: (query: Query = {}, signal?: AbortSignal) => listAll<T>(http, path, query, signal),
    get: (id: number, signal?: AbortSignal) => http<T>(`${path}/${id}`, { signal }),
    create,
    update,
    save: (id: number | null, body: Input) => (id === null ? create(body) : update(id, body)),
    remove: (id: number) => http<void>(`${path}/${id}`, { method: 'DELETE' }),
  };
}
export type AdminResource<T, Input> = ReturnType<typeof resource<T, Input>>;

export function createAdminApi(http: HttpClient) {
  return {
    knowledgeAreas: resource<KnowledgeArea, KnowledgeAreaInput>(http, '/knowledge-areas'),
    subjects: resource<Subject, SubjectInput>(http, '/subjects'),
    topics: resource<Topic, TopicInput>(http, '/topics'),
    states: resource<State, never>(http, '/states'),
    cities: resource<City, never>(http, '/cities'),
    addresses: resource<Address, AddressInput>(http, '/addresses'),
    institutions: resource<Institution, InstitutionInput>(http, '/institutions'),
    entranceExams: resource<AdminEntranceExam, EntranceExamInput>(http, '/entrance-exams'),
    questions: resource<AdminQuestion, QuestionInput>(http, '/questions'),
    answerOptions: resource<AnswerKeyOption, AnswerOptionInput>(http, '/answer-options'),
    questionImages: {
      ...resource<QuestionImage, QuestionImageInput>(http, '/question-images'),
      uploadUrl: (body: QuestionImageUploadInput) =>
        http<QuestionImageUpload>('/question-images/upload-url', { method: 'POST', body }),
    },
  };
}
export type AdminApi = ReturnType<typeof createAdminApi>;
