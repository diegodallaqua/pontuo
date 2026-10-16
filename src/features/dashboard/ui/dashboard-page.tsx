import { useCallback } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChartNoAxesCombined,
  ClipboardCheck,
  Crosshair,
  Sparkles,
  Target,
} from 'lucide-react';
import { useServices } from '../../../app/services';
import { useAuth } from '../../auth/application/auth-context';
import { useResource } from '../../../shared/hooks/use-resource';
import {
  AccuracyBar,
  CreateMockExamLink,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  StatCard,
} from '../../../shared/ui/components';
import { formatAccuracy } from '../../../shared/lib/date';
import { weakestSubjects } from '../../performance/domain/performance';
import { EvolutionChart } from '../../performance/ui/evolution-chart';
import { MockExamList } from '../../mock-exams/ui/mock-exam-list';

export function DashboardPage() {
  const { performance, mockExams } = useServices();
  const { user } = useAuth();
  const resource = useResource(
    useCallback(
      async (signal: AbortSignal) => {
        const [overview, subjects, evolution, history] = await Promise.all([
          performance.overview({}, signal),
          performance.breakdown('subjects', {}, signal),
          performance.evolution({}, signal),
          mockExams.list(user!.id, signal),
        ]);
        return { overview, subjects, evolution, history: history.sort((a, b) => b.id - a.id) };
      },
      [performance, mockExams, user],
    ),
  );
  return (
    <>
      <PageHeader
        eyebrow="SEU ESPAÇO DE ESTUDO"
        title={`Vamos avançar, ${user?.username ?? 'estudante'}?`}
        description="Um pouco de prática hoje. Um passo importante para o seu amanhã."
        action={<CreateMockExamLink />}
      />
      <section className="dashboard-hero">
        <div>
          <span className="pill pill-dark">
            <Sparkles size={13} /> SUA PRÓXIMA CONQUISTA
          </span>
          <h2>
            O seu futuro se constrói
            <br />
            uma questão por vez.
          </h2>
          <p>
            Escolha seu foco, desafie seus conhecimentos
            <br className="desktop-only" /> e transforme cada resultado em direção.
          </p>
          <Link className="hero-link" to="/simulados/novo">
            Começar um novo simulado
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="hero-orbit" />
          <span className="hero-orbit hero-orbit-inner" />
          <div className="hero-target">
            <Target size={93} strokeWidth={1.3} />
          </div>
          <span className="hero-art-tag">
            <span className="live-dot" /> O próximo passo é seu.
          </span>
          <span className="hero-plus">+</span>
          <span className="hero-star">✦</span>
        </div>
      </section>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorState error={resource.error} onRetry={resource.reload} />
      ) : (
        resource.data &&
        (() => {
          const { overview, history, evolution, subjects } = resource.data;
          const weak = weakestSubjects(subjects);
          return (
            <>
              <div className="section-heading">
                <h2>Seu caminho, em números</h2>
                <span className="muted text-small">Todos os simulados finalizados</span>
              </div>
              <div className="stats-grid">
                <StatCard
                  label="Simulados concluídos"
                  value={overview.finishedMockExams}
                  detail="Experiência a cada tentativa"
                  icon={<ClipboardCheck size={19} />}
                />
                <StatCard
                  label="Questões respondidas"
                  value={overview.answered}
                  detail="Conhecimento em movimento"
                  icon={<BookOpen size={19} />}
                />
                <StatCard
                  label="Aproveitamento geral"
                  value={formatAccuracy(overview.accuracy)}
                  detail={`${overview.correct} acertos em ${overview.questions} questões`}
                  icon={<Crosshair size={19} />}
                  tone="stat-highlight"
                />
                <StatCard
                  label="Tempo médio"
                  value={
                    overview.averageDurationMinutes == null ? (
                      '—'
                    ) : (
                      <>
                        {overview.averageDurationMinutes}
                        <small> min</small>
                      </>
                    )
                  }
                  detail="Por simulado finalizado"
                  icon={<ChartNoAxesCombined size={19} />}
                />
              </div>
              <div className="dashboard-middle">
                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <h2>Aprendizado em movimento</h2>
                      <p className="muted text-small">Seu aproveitamento a cada simulado.</p>
                    </div>
                    <Link className="text-link" to="/desempenho">
                      Ver análise
                      <ArrowUpRight size={15} />
                    </Link>
                  </div>
                  <EvolutionChart points={evolution} />
                </section>
                <section className="panel focus-panel">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">ESTUDE COM DIREÇÃO</span>
                      <h2>Um pouco mais de atenção</h2>
                    </div>
                    <span className="focus-icon">
                      <Target size={21} />
                    </span>
                  </div>
                  {weak.length ? (
                    <>
                      <p className="muted text-small">Disciplinas com espaço para evoluir.</p>
                      {weak.map((item) => (
                        <div className="focus-subject" key={item.id}>
                          <AccuracyBar
                            value={item.accuracy}
                            label={item.description ?? 'Disciplina'}
                            detail={`${item.questions} questões praticadas`}
                          />
                          <Link to={`/simulados/novo?subjectId=${item.id}`} className="text-link">
                            Praticar
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="focus-empty">
                      <Sparkles size={28} />
                      <h3>
                        {overview.finishedMockExams
                          ? 'Continue construindo sua base.'
                          : 'Vamos descobrir seu ponto de partida?'}
                      </h3>
                      <p>
                        A partir de 5 questões por disciplina, seus resultados ajudam a encontrar um
                        foco de estudo.
                      </p>
                      <Link className="text-link" to="/simulados/novo">
                        Preparar meu simulado
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                  )}
                </section>
              </div>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Seus últimos passos</h2>
                    <p className="muted text-small">
                      Retome um simulado ou confira seus resultados.
                    </p>
                  </div>
                  <Link className="text-link" to="/simulados">
                    Ver todos
                    <ArrowRight size={15} />
                  </Link>
                </div>
                {history.length ? (
                  <MockExamList mockExams={history.slice(0, 4)} />
                ) : (
                  <EmptyState
                    title="Sua jornada está começando"
                    description="Crie seu primeiro simulado. Seus próximos passos aparecerão por aqui."
                    action={<CreateMockExamLink label="Criar meu primeiro simulado" />}
                  />
                )}
              </section>
            </>
          );
        })()
      )}
    </>
  );
}
