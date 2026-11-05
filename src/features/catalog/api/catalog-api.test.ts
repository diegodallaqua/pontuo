import { describe, expect, it, vi } from 'vitest';
import { createCatalogApi } from './catalog-api';
import type { HttpClient } from '../../../shared/lib/http';

describe('catálogo paginado', () => {
  it('conta questões com uma página de um registro', async () => {
    const http = vi.fn<HttpClient>().mockResolvedValue({ content: [], totalElements: 42 });
    await expect(createCatalogApi(http as HttpClient).count({ subjectId: 3 })).resolves.toBe(42);
    expect(http).toHaveBeenCalledWith('/questions', {
      query: { subjectId: 3, page: 1, limit: 1 },
      signal: undefined,
    });
  });
  it('reúne todas as páginas de cada lista de filtros', async () => {
    const http = vi.fn<HttpClient>().mockImplementation(async (path, options) => ({
      content: [{ id: Number(options?.query?.page), path }],
      last: options?.query?.page === 2,
    })) as HttpClient;
    const catalog = await createCatalogApi(http).load();
    expect(catalog.topics).toEqual([
      { id: 1, path: '/topics' },
      { id: 2, path: '/topics' },
    ]);
    expect(http).toHaveBeenCalledTimes(8);
  });
});
