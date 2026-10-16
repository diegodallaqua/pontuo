export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 0,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type Query = Record<string, string | number | undefined | null>;
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
  authenticated?: boolean;
}
export type HttpClient = <T>(path: string, options?: RequestOptions) => Promise<T>;

export function createHttpClient({
  baseUrl,
  getToken,
  onUnauthorized,
  fetcher = fetch,
}: {
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized: () => void;
  fetcher?: typeof fetch;
}): HttpClient {
  return async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const query = new URLSearchParams();
    Object.entries(options.query ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
    });
    const token = options.authenticated === false ? null : getToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    let response: Response;
    try {
      response = await fetcher(
        `${baseUrl.replace(/\/$/, '')}${path}${query.size ? `?${query}` : ''}`,
        {
          method: options.method ?? 'GET',
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: options.signal
            ? AbortSignal.any([options.signal, AbortSignal.timeout(30_000)])
            : AbortSignal.timeout(30_000),
          credentials: 'omit',
        },
      );
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new ApiError(
        'Não foi possível conectar à Pontuo. Verifique sua conexão e tente novamente.',
      );
    }
    const raw = await response.text();
    let data: unknown;
    try {
      data = raw ? JSON.parse(raw) : undefined;
    } catch {
      data = undefined;
    }
    if (!response.ok) {
      if (response.status === 401 && token && token === getToken()) onUnauthorized();
      const fields =
        data && typeof data === 'object'
          ? Object.fromEntries(
              Object.entries(data).filter(
                (entry): entry is [string, string] => typeof entry[1] === 'string',
              ),
            )
          : {};
      const defaults: Record<number, string> = {
        400: 'Confira os campos e tente novamente.',
        401: token
          ? 'Sua sessão expirou. Entre novamente para continuar.'
          : 'Usuário ou senha incorretos.',
        403: 'Você não tem permissão para acessar este conteúdo.',
        404: 'O conteúdo solicitado não foi encontrado.',
        409:
          fields.message ?? 'Os dados já existem ou foram alterados. Atualize antes de continuar.',
      };
      const message =
        response.status >= 500
          ? 'O serviço está indisponível no momento. Tente novamente em instantes.'
          : (defaults[response.status] ??
            fields.message ??
            'Não foi possível concluir a operação.');
      throw new ApiError(message, response.status, fields);
    }
    if (response.status !== 204 && data === undefined) {
      throw new ApiError(
        'O serviço retornou uma resposta inesperada. Tente novamente.',
        response.status,
      );
    }
    return data as T;
  };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Algo deu errado. Tente novamente.';
}
