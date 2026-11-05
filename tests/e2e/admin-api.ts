import type { Page } from '@playwright/test';
import { startSession } from './contract-api';

// Fixtures da área administrativa: CRUD paginado em memória com as regras da API que a
// interface precisa respeitar (busca, filtros, gabarito único e registros em uso).
export const admin = {
  id: 1,
  username: 'Coordenação',
  email: 'coordenacao@example.test',
  birthDate: '1990-01-01',
  userRole: { id: 1, description: 'Administrador' },
};
type Row = { id: number; [field: string]: unknown };
type Body = Record<string, unknown>;
interface Resource {
  rows: Row[];
  build: (body: Body) => Omit<Row, 'id'>;
  search: (row: Row) => string;
  filters?: Record<string, (row: Row) => unknown>;
  inUse?: (id: number) => boolean;
  validate?: (body: Body, id: number | null) => string | null;
}
const conflict = 'Operação recusada: o registro está em uso por outros dados ou já existe.';
// O MariaDB usa utf8mb4_unicode_ci: a busca ignora caixa e acentos.
const fold = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');

export async function mockAdminApi(page: Page) {
  const areas: Row[] = [
    { id: 1, description: 'Matemática e suas Tecnologias' },
    { id: 2, description: 'Ciências da Natureza' },
  ];
  const subjects: Row[] = [
    { id: 1, description: 'Matemática', knowledgeArea: areas[0] },
    { id: 2, description: 'Biologia', knowledgeArea: areas[1] },
  ];
  const topics: Row[] = [{ id: 1, description: 'Aritmética', subject: subjects[0] }];
  const states: Row[] = [
    { id: 1, name: 'Santa Catarina' },
    { id: 2, name: 'São Paulo' },
  ];
  const cities: Row[] = [
    { id: 1, name: 'Florianópolis', state: states[0] },
    { id: 2, name: 'Blumenau', state: states[0] },
    { id: 3, name: 'São Paulo', state: states[1] },
  ];
  const addresses: Row[] = [
    {
      id: 1,
      street: 'Rua dos Andradas',
      neighborhood: 'Santa Ifigênia',
      number: 140,
      complement: null,
      city: cities[2],
    },
  ];
  const institutions: Row[] = [
    {
      id: 1,
      name: 'Fundação Universitária para o Vestibular',
      acronym: 'FUVEST',
      address: addresses[0],
    },
  ];
  const entranceExams: Row[] = [
    {
      id: 1,
      name: 'Vestibular FUVEST (USP)',
      year: 2026,
      stage: '1ª Fase',
      institution: institutions[0],
    },
  ];
  const questions: Row[] = [
    {
      id: 1,
      statement: 'Quanto é 2 + 2?',
      explanation: 'Soma simples.',
      difficulty: 1,
      createdAt: '2026-10-01T10:00:00',
      entranceExam: entranceExams[0],
      topic: topics[0],
      subject: null,
    },
  ];
  const answerOptions: Row[] = [
    { id: 1, letter: 'A', text: '4', rightAnswer: true, questionId: 1 },
    { id: 2, letter: 'B', text: '5', rightAnswer: false, questionId: 1 },
  ];
  const questionImages: Row[] = [];
  const find = (rows: Row[], id: unknown) => rows.find((row) => row.id === Number(id)) ?? null;
  const resources: Record<string, Resource> = {
    '/knowledge-areas': {
      rows: areas,
      build: (body) => ({ description: body.description }),
      search: (row) => String(row.description),
      inUse: (id) => subjects.some((subject) => (subject.knowledgeArea as Row).id === id),
    },
    '/subjects': {
      rows: subjects,
      build: (body) => ({
        description: body.description,
        knowledgeArea: find(areas, body.knowledgeAreaId),
      }),
      search: (row) => String(row.description),
      filters: { knowledgeAreaId: (row) => (row.knowledgeArea as Row).id },
    },
    '/topics': {
      rows: topics,
      build: (body) => ({ description: body.description, subject: find(subjects, body.subjectId) }),
      search: (row) => String(row.description),
      filters: { subjectId: (row) => (row.subject as Row).id },
    },
    '/states': { rows: states, build: () => ({}), search: (row) => String(row.name) },
    '/cities': {
      rows: cities,
      build: () => ({}),
      search: (row) => String(row.name),
      filters: { stateId: (row) => (row.state as Row).id },
    },
    '/addresses': {
      rows: addresses,
      build: ({ cityId, ...body }) => ({ ...body, city: find(cities, cityId) }),
      search: (row) => String(row.street),
    },
    '/institutions': {
      rows: institutions,
      build: ({ addressId, ...body }) => ({ ...body, address: find(addresses, addressId) }),
      search: (row) => `${row.name} ${row.acronym}`,
      validate: (body, id) =>
        institutions.some((row) => row.acronym === body.acronym && row.id !== id) ? conflict : null,
    },
    '/entrance-exams': {
      rows: entranceExams,
      build: ({ institutionId, ...body }) => ({
        ...body,
        institution: find(institutions, institutionId),
      }),
      search: (row) => `${row.name} ${row.stage}`,
      filters: { institutionId: (row) => (row.institution as Row).id },
    },
    '/questions': {
      rows: questions,
      build: ({ entranceExamId, topicId, subjectId, ...body }) => ({
        ...body,
        createdAt: '2026-11-04T10:00:00',
        entranceExam: find(entranceExams, entranceExamId),
        topic: find(topics, topicId),
        subject: find(subjects, subjectId),
      }),
      search: (row) => String(row.statement),
      filters: {
        subjectId: (row) =>
          ((row.topic as Row | null)?.subject as Row | undefined)?.id ??
          (row.subject as Row | null)?.id,
        entranceExamId: (row) => (row.entranceExam as Row).id,
        difficulty: (row) => row.difficulty,
      },
      validate: (body) =>
        !body.topicId === !body.subjectId ? 'informe topicId ou subjectId, não os dois' : null,
    },
    '/answer-options': {
      rows: answerOptions,
      build: (body) => body,
      search: (row) => String(row.text),
      filters: { questionId: (row) => row.questionId },
      validate: (body, id) =>
        body.rightAnswer &&
        answerOptions.some(
          (row) => row.questionId === body.questionId && row.rightAnswer && row.id !== id,
        )
          ? `questão já tem alternativa correta: questionId=${body.questionId}`
          : null,
    },
    '/question-images': {
      rows: questionImages,
      build: (body) => body,
      search: (row) => String(row.subtitle ?? ''),
      filters: { questionId: (row) => row.questionId },
    },
  };
  const state = {
    requests: [] as {
      path: string;
      method: string;
      query: Record<string, string>;
      body: Body | null;
    }[],
    resources,
  };
  let nextId = 100;
  await startSession(page);
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname.replace(/^\/api/, '');
      const method = request.method();
      const body = request.postDataJSON() as Body | null;
      const query = Object.fromEntries(url.searchParams);
      state.requests.push({ path, method, query, body });
      const respond = (data: unknown, status = 200) =>
        status === 204
          ? route.fulfill({ status })
          : route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
      if (path === '/auth/me') return respond(admin);
      if (path === '/auth/logout') return respond(null, 204);
      const match = path.match(/^(\/[a-z-]+)(?:\/(\d+))?$/);
      const resource = match && resources[match[1]!];
      if (!resource) return respond({ message: `Endpoint não simulado: ${method} ${path}` }, 501);
      const id = match[2] ? Number(match[2]) : null;
      const current = id === null ? null : find(resource.rows, id);
      if (id !== null && !current) return respond({ message: 'Não encontrado' }, 404);
      if (method === 'GET' && current) return respond(current);
      if (method === 'GET') {
        const page = Number(query.page ?? 1);
        const limit = Number(query.limit ?? 20);
        const term = fold(query.search ?? '');
        const rows = resource.rows.filter(
          (row) =>
            fold(resource.search(row)).includes(term) &&
            Object.entries(resource.filters ?? {}).every(
              ([name, value]) => query[name] === undefined || String(value(row)) === query[name],
            ),
        );
        const totalPages = Math.ceil(rows.length / limit);
        return respond({
          content: rows.slice((page - 1) * limit, page * limit),
          page,
          limit,
          totalElements: rows.length,
          totalPages,
          last: page >= totalPages,
        });
      }
      if (method === 'DELETE') {
        if (resource.inUse?.(id!)) return respond({ message: conflict }, 409);
        resource.rows.splice(resource.rows.indexOf(current!), 1);
        return respond(null, 204);
      }
      const invalid = resource.validate?.(body!, id);
      if (invalid) return respond({ message: invalid }, 409);
      if (method === 'PUT') {
        Object.assign(current!, resource.build(body!));
        return respond(current);
      }
      const created = { id: nextId++, ...resource.build(body!) };
      resource.rows.push(created);
      return respond(created, 201);
    },
  );
  return state;
}
