import type { HttpClient, Query } from './http';

// Envelope das listagens da API: `page` começa em 1 e `limit` vai até 100.
export interface Page<T> {
  content: T[];
  page: number;
  limit: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
export const MAX_PAGE_SIZE = 100;

// Opções de selects precisam da lista inteira: percorre as páginas no maior tamanho aceito.
export async function listAll<T>(
  http: HttpClient,
  path: string,
  query: Query = {},
  signal?: AbortSignal,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const result = await http<Page<T>>(path, {
      query: { ...query, page, limit: MAX_PAGE_SIZE },
      signal,
    });
    items.push(...result.content);
    if (result.last || !result.content.length) return items;
  }
}
