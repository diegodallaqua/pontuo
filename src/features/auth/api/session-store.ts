import type { AuthSession } from '../domain/auth';

const key = 'pontuo.session.v1';
type Listener = () => void;
const listeners = new Set<Listener>();
function restore(): AuthSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null') as Partial<AuthSession> | null;
    return value &&
      typeof value.accessToken === 'string' &&
      typeof value.expiresAt === 'number' &&
      value.expiresAt > Date.now()
      ? { accessToken: value.accessToken, expiresAt: value.expiresAt }
      : null;
  } catch {
    return null;
  }
}
let session = restore();
export const sessionStore = {
  get: () => session,
  set(value: AuthSession | null) {
    session = value;
    try {
      if (value) sessionStorage.setItem(key, JSON.stringify(value));
      else sessionStorage.removeItem(key);
    } catch {
      /* Navegação privada pode impedir armazenamento; a sessão continua em memória. */
    }
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
