import { useCallback, useEffect, useState } from 'react';
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value';
import { useResource } from '../../../shared/hooks/use-resource';
import type { Query } from '../../../shared/lib/http';
import type { Page } from '../../../shared/lib/pagination';

export const ADMIN_PAGE_SIZE = 10;

// Paginação, busca e filtros no servidor. `load` deve ser estável (método do adaptador ou
// useCallback); os filtros são comparados por valor.
export function useAdminList<T>(
  load: (query: Query, signal: AbortSignal) => Promise<Page<T>>,
  filters: Query = {},
) {
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim());
  const scope = JSON.stringify({ ...filters, search: term });
  // Mudar busca ou filtro volta à primeira página sem disparar uma consulta da página antiga.
  const [position, setPosition] = useState({ scope, page: 1 });
  const page = position.scope === scope ? position.page : 1;
  const resource = useResource(
    useCallback(
      (signal: AbortSignal) =>
        load({ ...(JSON.parse(scope) as Query), page, limit: ADMIN_PAGE_SIZE }, signal),
      [load, scope, page],
    ),
  );
  const setPage = useCallback((next: number) => setPosition({ scope, page: next }), [scope]);
  const { data } = resource;
  useEffect(() => {
    // A exclusão do último registro da página deixaria a tela vazia.
    if (data && !data.content.length && page > 1) setPage(Math.max(1, data.totalPages));
  }, [data, page, setPage]);
  const filtered = !!term || Object.values(filters).some((value) => value != null && value !== '');
  return { ...resource, search, setSearch, page, setPage, filtered };
}
export type AdminList<T> = ReturnType<typeof useAdminList<T>>;
