import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Eye, EyeOff, Target, TrendingUp, Sparkles } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../application/auth-context';
import { useServices } from '../../../app/services';
import { ApiError, errorMessage } from '../../../shared/lib/http';
import { localDateInput } from '../../../shared/lib/date';
import { Brand, Button, ErrorBanner } from '../../../shared/ui/components';

export function AuthPage({ register = false }: { register?: boolean }) {
  const { login, hasSession } = useAuth();
  const { auth } = useServices();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const state = location.state as {
    from?: string;
    registered?: boolean;
    logoutWarning?: boolean;
  } | null;
  const destination =
    state?.from?.startsWith('/') && !state.from.startsWith('//') ? state.from : '/';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (hasSession) return <Navigate to={destination} replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const username = String(form.get('username')).trim();
    const password = String(form.get('password'));
    if (register && password !== form.get('confirmPassword')) {
      setError(new Error('As senhas precisam ser iguais.'));
      return;
    }
    if (register && new TextEncoder().encode(password).length > 72) {
      setError(
        new Error(
          'A senha deve ter até 72 bytes. Caracteres acentuados podem ocupar mais de um byte.',
        ),
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (register) {
        await auth.register({
          username,
          password,
          email: String(form.get('email')).trim(),
          birthDate: String(form.get('birthDate')),
        });
        navigate('/entrar', { replace: true, state: { registered: true } });
      } else {
        await login({ username, password });
        navigate(destination, { replace: true });
      }
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  const fieldErrors = error instanceof ApiError ? error.fields : {};
  const fieldLabels: Record<string, string> = {
    username: 'Usuário',
    email: 'E-mail',
    birthDate: 'Data de nascimento',
    password: 'Senha',
  };
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Brand light />
        <div className="auth-story-content">
          <span className="pill pill-dark">
            <span className="live-dot" />
            CADA QUESTÃO, UM PASSO À FRENTE
          </span>
          <h1>
            Seu futuro merece
            <br />
            um bom <span>começo.</span>
          </h1>
          <p>
            Transforme a vontade de passar em um plano. Pratique com questões de vestibulares e
            descubra onde você pode ir além.
          </p>
          <div className="study-illustration" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="study-card">
              <span className="mini-label">
                <TrendingUp size={16} /> UM PASSO DE CADA VEZ
              </span>
              <div className="study-bars">
                {[30, 45, 40, 62, 57, 78, 94].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="study-card-footer">
                <span>Pratique. Aprenda. Evolua.</span>
                <span className="check-circle">
                  <Check size={17} />
                </span>
              </div>
            </div>
            <span className="floating-icon">
              <Target size={27} />
            </span>
            <span className="floating-spark">
              <Sparkles size={22} />
            </span>
          </div>
          <div className="auth-benefits">
            <span>
              <Check size={16} /> Simulados do seu jeito
            </span>
            <span>
              <Check size={16} /> Evolução que você vê
            </span>
          </div>
        </div>
        <p className="auth-footer">Seu próximo passo começa aqui.</p>
      </section>
      <section className="auth-form-side">
        <div className="mobile-brand">
          <Brand />
        </div>
        <div className="auth-form-wrap" key={register ? 'register' : 'login'}>
          <p className="eyebrow">{register ? 'VAMOS COMEÇAR' : 'BOM TER VOCÊ AQUI'}</p>
          <h2>{register ? 'Crie sua conta.' : 'Seu próximo passo.'}</h2>
          <p className="muted">
            {register
              ? 'Um espaço para praticar, entender e evoluir.'
              : 'Entre na sua conta e continue a sua preparação.'}
          </p>
          {state?.registered && (
            <div className="notice notice-success" role="status">
              Conta criada! Entre com seu usuário ou e-mail.
            </div>
          )}
          {state?.logoutWarning && (
            <div className="notice">
              Você saiu neste navegador. Não foi possível confirmar a revogação da sessão no
              servidor.
            </div>
          )}
          {error != null && (
            <ErrorBanner>
              {errorMessage(error)}
              {Object.entries(fieldErrors)
                .filter(([key]) => fieldLabels[key])
                .map(([key, message]) => (
                  <p key={key}>
                    {fieldLabels[key]}: {message.replace(new RegExp(`^${key}\\s*`), '')}
                  </p>
                ))}
            </ErrorBanner>
          )}
          <form onSubmit={submit} className="form-stack">
            <label>
              {register ? 'Nome de usuário' : 'Usuário ou e-mail'}
              <input
                name="username"
                autoComplete="username"
                placeholder={register ? 'Como podemos chamar você?' : 'Seu usuário ou e-mail'}
                maxLength={register ? 60 : 160}
                required
                autoFocus
              />
            </label>
            {register && (
              <>
                <label>
                  E-mail
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    maxLength={160}
                    required
                  />
                </label>
                <label>
                  Data de nascimento
                  <input
                    name="birthDate"
                    type="date"
                    autoComplete="bday"
                    max={localDateInput(yesterday)}
                    required
                  />
                </label>
              </>
            )}
            <label>
              Senha
              <div className="password-field">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  placeholder={register ? 'Pelo menos 8 caracteres' : 'Sua senha'}
                  minLength={register ? 8 : undefined}
                  maxLength={72}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {register && (
              <label>
                Confirme sua senha
                <input
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Digite a senha novamente"
                  minLength={8}
                  maxLength={72}
                  required
                />
              </label>
            )}
            <Button type="submit" busy={busy} className="button-full">
              {register ? 'Criar minha conta' : 'Entrar na minha conta'}
              <ArrowRight size={18} />
            </Button>
          </form>
          <p className="auth-switch">
            {register ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'}{' '}
            <Link
              to={register ? '/entrar' : '/cadastro'}
              state={state?.from ? { from: state.from } : null}
            >
              {register ? 'Entrar' : 'Comece por aqui'}
            </Link>
          </p>
          <p className="auth-form-note">Mais clareza nos estudos. Mais confiança no seu caminho.</p>
        </div>
      </section>
    </main>
  );
}
