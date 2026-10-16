import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useServices } from '../../../app/services';
import { sessionStore } from '../api/session-store';
import type { Credentials, User } from '../domain/auth';

interface AuthContextValue {
  user: User | null;
  hasSession: boolean;
  loading: boolean;
  error: unknown;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<boolean>;
  retry: () => void;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth } = useServices();
  const session = useSyncExternalStore(sessionStore.subscribe, sessionStore.get);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!session);
  const [error, setError] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    if (!session) {
      setUser(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    auth.me(controller.signal).then(
      (current) => {
        if (!controller.signal.aborted) {
          setUser(current);
          setLoading(false);
        }
      },
      (failure) => {
        if (!controller.signal.aborted) {
          setError(failure);
          setLoading(false);
        }
      },
    );
    return () => controller.abort();
  }, [auth, session, revision]);
  useEffect(() => {
    if (!session) return;
    const expire = () => {
      if (Date.now() >= session.expiresAt) sessionStore.set(null);
    };
    const timeout = window.setTimeout(expire, Math.max(0, session.expiresAt - Date.now()));
    document.addEventListener('visibilitychange', expire);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', expire);
    };
  }, [session]);
  async function login(credentials: Credentials) {
    const response = await auth.login(credentials);
    setUser(response.user);
    sessionStore.set({
      accessToken: response.accessToken,
      expiresAt: Date.now() + response.expiresIn * 1000,
    });
  }
  async function logout() {
    let revoked = true;
    try {
      await auth.logout();
    } catch {
      revoked = false;
    } finally {
      sessionStore.set(null);
      setUser(null);
    }
    return revoked;
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        hasSession: !!session,
        loading,
        error,
        login,
        logout,
        retry: () => setRevision((value) => value + 1),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve estar dentro de AuthProvider');
  return context;
}
