import type { HttpClient } from '../../../shared/lib/http';
import type { Credentials, LoginResponse, Registration, User } from '../domain/auth';

export function createAuthApi(http: HttpClient) {
  return {
    login: (body: Credentials) =>
      http<LoginResponse>('/auth/login', { method: 'POST', body, authenticated: false }),
    register: (body: Registration) =>
      http<User>('/auth/register', { method: 'POST', body, authenticated: false }),
    me: (signal?: AbortSignal) => http<User>('/auth/me', { signal }),
    logout: () => http<void>('/auth/logout', { method: 'POST' }),
  };
}
