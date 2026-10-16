import { useCallback, useEffect, useState } from 'react';

// O loader deve ser estabilizado com useCallback. A limpeza cancela respostas obsoletas.
export function useResource<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ data: T | null; error: unknown; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, error: null, loading: true });
    loader(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ data, error: null, loading: false });
      },
      (error) => {
        if (!controller.signal.aborted) setState({ data: null, error, loading: false });
      },
    );
    return () => controller.abort();
  }, [loader, revision]);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { ...state, reload };
}
