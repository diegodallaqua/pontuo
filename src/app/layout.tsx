import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../features/auth/application/auth-context';
import { Brand, Button } from '../shared/ui/components';

const navigation = [
  { to: '/', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/simulados', label: 'Meus simulados', icon: ClipboardList, end: true },
  { to: '/desempenho', label: 'Meu desempenho', icon: ChartNoAxesCombined, end: false },
];
export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = sidebar.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled)',
    );
    controls?.[0]?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !controls?.length) return;
      const first = controls[0]!,
        last = controls[controls.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trapFocus);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', trapFocus);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, []);
  async function signOut() {
    setLeaving(true);
    const revoked = await logout();
    navigate('/entrar', { replace: true, state: { logoutWarning: !revoked } });
  }
  const currentLabel =
    location.pathname === '/'
      ? 'Visão geral'
      : location.pathname === '/desempenho'
        ? 'Meu desempenho'
        : 'Meus simulados';
  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>
      {open && (
        <button className="nav-scrim" aria-label="Fechar menu" onClick={() => setOpen(false)} />
      )}
      <aside ref={sidebar} id="app-navigation" className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <span className="sidebar-label">SUA PREPARAÇÃO</span>
        <nav aria-label="Navegação principal">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              to={to}
              end={end}
              key={to}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <Link className="button button-primary sidebar-create" to="/simulados/novo">
          <Plus size={18} />
          Criar simulado
        </Link>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sparkles size={22} />
            <h3>
              Pequenos passos.
              <br />
              Grandes conquistas.
            </h3>
            <p>Cada questão é uma chance de aprender algo novo.</p>
            <Link to="/desempenho">
              Veja sua evolução <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="sidebar-user">
            <span className="avatar">{user?.username.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{user?.username}</strong>
              <small>Minha preparação</small>
            </div>
            <Button
              variant="ghost"
              busy={leaving}
              onClick={signOut}
              aria-label="Sair da conta"
              title="Sair da conta"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="topbar-path">
            <button
              className="icon-button mobile-only"
              aria-label="Abrir menu"
              aria-expanded={open}
              aria-controls="app-navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span className="muted">Minha jornada</span>
            <span className="path-divider">/</span>
            <strong>{currentLabel}</strong>
          </div>
          <span className="topbar-motto">
            <span className="live-dot" /> Um passo mais perto.
          </span>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>
            Pontuo<span className="brand-dot">.</span> Seu próximo passo começa aqui.
          </span>
          <span>Feito para quem quer ir além.</span>
        </footer>
      </div>
    </div>
  );
}
