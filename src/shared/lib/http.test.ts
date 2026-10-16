import { describe, expect, it, vi } from 'vitest';
import { ApiError, createHttpClient } from './http';

function setup(response: Response) {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
  const onUnauthorized = vi.fn();
  const http = createHttpClient({
    baseUrl: '/api/',
    getToken: () => 'token',
    onUnauthorized,
    fetcher,
  });
  return { http, fetcher, onUnauthorized };
}
describe('cliente HTTP', () => {
  it('encaminha filtros combinados e token sem enviar campos vazios', async () => {
    const { http, fetcher } = setup(Response.json([]));
    await http('/questions/draw', {
      query: { subjectId: 3, difficulty: 2, entranceExamId: undefined },
    });
    expect(fetcher).toHaveBeenCalledWith(
      '/api/questions/draw?subjectId=3&difficulty=2',
      expect.objectContaining({
        headers: { Accept: 'application/json', Authorization: 'Bearer token' },
      }),
    );
  });
  it('processa 204 sem tentar desserializar JSON', async () => {
    const { http } = setup(new Response(null, { status: 204 }));
    await expect(http('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });
  it('encerra a sessão em 401 autenticado', async () => {
    const { http, onUnauthorized } = setup(Response.json({ message: 'Inválido' }, { status: 401 }));
    await expect(http('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
  it('não envia token ou encerra sessão para credenciais incorretas no login', async () => {
    const { http, fetcher, onUnauthorized } = setup(Response.json({}, { status: 401 }));
    await expect(
      http('/auth/login', {
        method: 'POST',
        authenticated: false,
        body: { username: 'a', password: 'b' },
      }),
    ).rejects.toThrow('Usuário ou senha');
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      }),
    );
  });
  it('preserva validações por campo', async () => {
    const { http } = setup(Response.json({ email: 'email deve ser válido' }, { status: 400 }));
    await expect(http('/auth/register')).rejects.toMatchObject({
      fields: { email: 'email deve ser válido' },
    });
  });
  it('não trata acesso negado como sessão expirada', async () => {
    const { http, onUnauthorized } = setup(Response.json({}, { status: 403 }));
    await expect(http('/mock-exams/1')).rejects.toMatchObject({ status: 403 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
  it('trata HTML de erro do proxy sem exibir seu conteúdo', async () => {
    const { http } = setup(new Response('<html>Internal trace</html>', { status: 502 }));
    await expect(http('/questions')).rejects.toThrow('indisponível');
  });
  it('recusa uma resposta HTML com status 200', async () => {
    const { http } = setup(new Response('<html>SPA fallback</html>'));
    await expect(http('/questions')).rejects.toThrow('inesperada');
  });
  it('não invalida um token novo por causa do 401 de um token anterior', async () => {
    let token = 'old';
    const onUnauthorized = vi.fn();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      token = 'new';
      return new Response(null, { status: 401 });
    });
    const http = createHttpClient({
      baseUrl: '/api',
      getToken: () => token,
      onUnauthorized,
      fetcher,
    });
    await expect(http('/auth/me')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
  it('não repete mutações automaticamente quando a rede cai', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    const http = createHttpClient({
      baseUrl: '/api',
      getToken: () => null,
      onUnauthorized: vi.fn(),
      fetcher,
    });
    await expect(http('/mock-exams', { method: 'POST' })).rejects.toThrow('conectar');
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
