import { lazy, Suspense, useEffect } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { useAuth } from '../features/auth/application/auth-context';
import { isAdministrator } from '../features/auth/domain/auth';
import { Button, ErrorState, Loading } from '../shared/ui/components';
import { AppLayout } from './layout';

const AuthPage = lazy(() =>
  import('../features/auth/ui/auth-page').then((module) => ({ default: module.AuthPage })),
);
const DashboardPage = lazy(() =>
  import('../features/dashboard/ui/dashboard-page').then((module) => ({
    default: module.DashboardPage,
  })),
);
const BuilderPage = lazy(() =>
  import('../features/mock-exams/ui/builder-page').then((module) => ({
    default: module.BuilderPage,
  })),
);
const HistoryPage = lazy(() =>
  import('../features/mock-exams/ui/history-page').then((module) => ({
    default: module.HistoryPage,
  })),
);
const SessionPage = lazy(() =>
  import('../features/mock-exams/ui/session-page').then((module) => ({
    default: module.SessionPage,
  })),
);
const ResultPage = lazy(() =>
  import('../features/mock-exams/ui/result-page').then((module) => ({
    default: module.ResultPage,
  })),
);
const PerformancePage = lazy(() =>
  import('../features/performance/ui/performance-page').then((module) => ({
    default: module.PerformancePage,
  })),
);
const AdminOverviewPage = lazy(() =>
  import('../features/admin/ui/overview-page').then((module) => ({
    default: module.AdminOverviewPage,
  })),
);
const QuestionsAdminPage = lazy(() =>
  import('../features/admin/ui/questions-page').then((module) => ({
    default: module.QuestionsAdminPage,
  })),
);
const QuestionEditorPage = lazy(() =>
  import('../features/admin/ui/question-editor-page').then((module) => ({
    default: module.QuestionEditorPage,
  })),
);
const CatalogAdminPage = lazy(() =>
  import('../features/admin/ui/catalog-page').then((module) => ({
    default: module.CatalogAdminPage,
  })),
);

function RequireAuth() {
  const { hasSession, loading, error, retry, logout } = useAuth();
  const location = useLocation();
  if (!hasSession)
    return <Navigate to="/entrar" state={{ from: location.pathname + location.search }} replace />;
  if (loading) return <Loading label="Restaurando sua sessão…" />;
  if (error)
    return (
      <div className="auth-recovery">
        <ErrorState error={error} onRetry={retry} />
        <Button variant="secondary" onClick={() => void logout()}>
          Sair desta conta
        </Button>
      </div>
    );
  return <Outlet />;
}
// Esconde a área administrativa de quem não tem o perfil; a API recusa as escritas com 403.
function RequireAdmin() {
  const { user } = useAuth();
  return isAdministrator(user) ? <Outlet /> : <Navigate to="/" replace />;
}
function RouteEffects() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const names: Record<string, string> = {
      '/': 'Visão geral',
      '/entrar': 'Entrar',
      '/cadastro': 'Criar conta',
      '/simulados': 'Meus simulados',
      '/simulados/novo': 'Criar simulado',
      '/desempenho': 'Meu desempenho',
      '/admin': 'Administração',
      '/admin/questoes': 'Banco de questões',
      '/admin/questoes/nova': 'Nova questão',
    };
    const fallback = location.pathname.startsWith('/admin/') ? 'Administração' : 'Meu simulado';
    document.title = `${names[location.pathname] ?? fallback} · Pontuo`;
  }, [location.pathname]);
  return null;
}
export function AppRouter() {
  return (
    <>
      <RouteEffects />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/entrar" element={<AuthPage key="login" />} />
          <Route path="/cadastro" element={<AuthPage key="register" register />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="simulados" element={<HistoryPage />} />
              <Route path="simulados/novo" element={<BuilderPage />} />
              <Route path="simulados/:id/execucao" element={<SessionPage />} />
              <Route path="simulados/:id/resultado" element={<ResultPage />} />
              <Route path="desempenho" element={<PerformancePage />} />
              <Route path="admin" element={<RequireAdmin />}>
                <Route index element={<AdminOverviewPage />} />
                <Route path="questoes" element={<QuestionsAdminPage />} />
                <Route path="questoes/nova" element={<QuestionEditorPage />} />
                <Route path="questoes/:id" element={<QuestionEditorPage />} />
                <Route path="catalogo" element={<Navigate to="areas" replace />} />
                <Route path="catalogo/:section" element={<CatalogAdminPage />} />
              </Route>
            </Route>
          </Route>
          <Route
            path="*"
            element={
              <div className="not-found">
                <span className="eyebrow">404 · FORA DO CAMINHO</span>
                <h1>Vamos voltar um passo?</h1>
                <p className="muted">Esta página não foi encontrada.</p>
                <Link className="button button-primary" to="/">
                  Voltar ao início
                </Link>
              </div>
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}
