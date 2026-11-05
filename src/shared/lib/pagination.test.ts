import { describe, expect, it, vi } from 'vitest';
import { listAll } from './pagination';
import type { HttpClient } from './http';

describe('listagem completa', () => {
  it('percorre as páginas no teto da API e preserva os filtros', async () => {
    const http = vi.fn<HttpClient>().mockImplementation(async (_path, options) => {
      const page = Number(options?.query?.page);
      return { content: page === 1 ? [{ id: 1 }, { id: 2 }] : [{ id: 3 }], last: page === 2 };
    }) as HttpClient;
    await expect(listAll(http, '/topics', { subjectId: 4 })).resolves.toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]);
    expect(http).toHaveBeenCalledTimes(2);
    expect(http).toHaveBeenLastCalledWith('/topics', {
      query: { subjectId: 4, page: 2, limit: 100 },
      signal: undefined,
    });
  });
});
