import { useCallback, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, BookOpen, ClipboardCheck, Target, Timer } from 'lucide-react';
import { useServices } from '../../../app/services';
import { useResource } from '../../../shared/hooks/use-resource';
import {
  AccuracyBar,
  Button,
  CreateMockExamLink,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  StatCard,
} from '../../../shared/ui/components';
import { formatAccuracy } from '../../../shared/lib/date';
import {
  MIN_INSIGHT_QUESTIONS,
  type PerformanceFilter,
  type PerformanceItem,
} from '../domain/performance';
import { EvolutionChart } from './evolution-chart';

function Breakdown({
  title,
  items,
  difficulty = false,
}: {
  title: string;
  items: PerformanceItem[];
  difficulty?: boolean;
}) {
  const labels: Record<number, string> = { 1: 'Fácil', 2: 'Média', 3: 'Difícil' };
  return (
    <section className="panel">
      <h2>{title}</h2>
      {items.length ? (
        <div className="breakdown-list">
          {items.map((item) => (
            <AccuracyBar
              key={item.id}
              label={
                difficulty
                  ? (labels[item.id] ?? 'Não informada')
                  : (item.description ?? 'Não informado')
              }
              value={item.accuracy}
              detail={`${item.correct} de ${item.questions} questões${item.questions < MIN_INSIGHT_QUESTIONS ? ' · Amostra pequena' : ''}`}
            />
          ))}
        </div>
      ) : (
        <p className="muted empty-copy">Ainda não há respostas neste recorte.</p>
      )}
    </section>
  );
}
export function PerformancePage() {
  const { performance, catalog } = useServices();
  const [filter, setFilter] = useState<PerformanceFilter>({});
  const [draft, setDraft] = useState<PerformanceFilter>({});
  const catalogResource = useResource(useCallback((signal) => catalog.load(signal), [catalog]));
  const resource = useResource(
    useCallback(
      async (signal: AbortSignal) => {
        const [overview, evolution, knowledgeAreas, subjects, topics, difficulty, weakTopics] =
          await Promise.all([
            performance.overview(filter, signal),
            performance.evolution(filter, signal),
            performance.breakdown('knowledge-areas', filter, signal),
            performance.breakdown('subjects', filter, signal),
            performance.breakdown('topics', filter, signal),
            performance.breakdown('difficulty', filter, signal),
            performance.breakdown('weak-topics', filter, signal),
          ]);
        return { overview, evolution, knowledgeAreas, subjects, topics, difficulty, weakTopics };
      },
      [performance, filter],
    ),
  );
  function applyFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilter({ ...draft });
  }
  const dateInvalid = !!(draft.from && draft.to && draft.from > draft.to);
  return (
    <>
      <PageHeader
        eyebrow="CADA RESULTADO CONTA"
        title="Encontre sua direção."
        description="Entenda suas conquistas e descubra onde concentrar os próximos estudos."
        action={<CreateMockExamLink />}
      />
      <form className="panel performance-filters" onSubmit={applyFilter}>
        <div className="filter-grid">
          <label>
            De
            <input
              type="date"
              value={draft.from ?? ''}
              max={draft.to}
              onChange={(event) => setDraft({ ...draft, from: event.target.value || undefined })}
            />
          </label>
          <label>
            Até
            <input
              type="date"
              value={draft.to ?? ''}
              min={draft.from}
              onChange={(event) => setDraft({ ...draft, to: event.target.value || undefined })}
            />
          </label>
          <label>
            Vestibular
            <select
              value={draft.entranceExamId ?? ''}
              onChange={(event) =>
                setDraft({ ...draft, entranceExamId: Number(event.target.value) || undefined })
              }
            >
              <option value="">Todos os vestibulares</option>
              {catalogResource.data?.entranceExams.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.year}
                </option>
              ))}
            </select>
          </label>
          <label>
            Disciplina da evolução
            <select
              value={draft.subjectId ?? ''}
              onChange={(event) =>
                setDraft({ ...draft, subjectId: Number(event.target.value) || undefined })
              }
            >
              <option value="">Todas as disciplinas</option>
              {catalogResource.data?.subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.description}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={dateInvalid}>
            Aplicar
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setDraft({});
              setFilter({});
            }}
          >
            Limpar
          </Button>
        </div>
        <p className="muted text-small">
          O período vale para toda a análise. Vestibular filtra os detalhamentos; disciplina filtra
          a evolução e os assuntos.
        </p>
        {dateInvalid && (
          <p role="alert" className="field-error">
            A data inicial deve ser anterior à final.
          </p>
        )}
        {!!catalogResource.error && (
          <p role="status" className="field-error">
            Não foi possível carregar os filtros de catálogo.{' '}
            <button type="button" className="text-link" onClick={catalogResource.reload}>
              Tentar novamente
            </button>
          </p>
        )}
      </form>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorState error={resource.error} onRetry={resource.reload} />
      ) : (
        resource.data &&
        (() => {
          const data = resource.data;
          if (!data.overview.finishedMockExams)
            return (
              <section className="panel">
                <EmptyState
                  title="O primeiro resultado abre o caminho"
                  description="Finalize um simulado ou amplie o período para ver seu desempenho, suas áreas de atenção e sua evolução."
                  action={<CreateMockExamLink />}
                />
              </section>
            );
          return (
            <>
              <div className="stats-grid">
                <StatCard
                  label="Simulados concluídos"
                  value={data.overview.finishedMockExams}
                  detail="No período selecionado"
                  icon={<ClipboardCheck size={18} />}
                />
                <StatCard
                  label="Questões respondidas"
                  value={data.overview.answered}
                  detail={`${data.overview.questions - data.overview.answered} deixadas em branco`}
                  icon={<BookOpen size={18} />}
                />
                <StatCard
                  label="Aproveitamento geral"
                  value={formatAccuracy(data.overview.accuracy)}
                  detail="Acertos sobre todas as questões"
                  icon={<Target size={18} />}
                  tone="stat-highlight"
                />
                <StatCard
                  label="Tempo médio"
                  value={
                    data.overview.averageDurationMinutes == null
                      ? '—'
                      : `${data.overview.averageDurationMinutes} min`
                  }
                  detail="Por simulado concluído"
                  icon={<Timer size={18} />}
                />
              </div>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Seu aprendizado, ao longo do tempo</h2>
                    <p className="muted text-small">
                      Últimos 12 simulados do período
                      {filter.subjectId ? ' na disciplina selecionada' : ''}.
                    </p>
                  </div>
                  <span className="pill">EVOLUÇÃO</span>
                </div>
                <EvolutionChart points={data.evolution} />
              </section>
              <div className="two-columns">
                <Breakdown title="Por área de conhecimento" items={data.knowledgeAreas} />
                <Breakdown title="Por disciplina" items={data.subjects} />
                <Breakdown title="Por assunto" items={data.topics} />
                <Breakdown title="Por dificuldade" items={data.difficulty} difficulty />
              </div>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">SEU PRÓXIMO FOCO</p>
                    <h2>Assuntos para reforçar</h2>
                    <p className="muted text-small">
                      Menores aproveitamentos entre assuntos com pelo menos 5 questões.
                    </p>
                  </div>
                  <Target size={24} className="accent" />
                </div>
                {data.weakTopics.length ? (
                  <div className="weak-topic-grid">
                    {data.weakTopics.map((item) => (
                      <article className="weak-topic" key={item.id}>
                        <AccuracyBar
                          label={item.description ?? 'Assunto'}
                          value={item.accuracy}
                          detail={`${item.questions} questões praticadas`}
                        />
                        <Link className="text-link" to={`/simulados/novo?topicId=${item.id}`}>
                          Praticar este assunto
                          <ArrowUpRight size={16} />
                        </Link>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted">
                    Continue praticando para reunir uma amostra de pelo menos 5 questões por
                    assunto.
                  </p>
                )}
              </section>
            </>
          );
        })()
      )}
    </>
  );
}
