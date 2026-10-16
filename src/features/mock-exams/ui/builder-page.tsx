import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, Layers, SlidersHorizontal } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useServices } from '../../../app/services';
import { useResource } from '../../../shared/hooks/use-resource';
import {
  Button,
  ErrorBanner,
  ErrorState,
  Loading,
  PageHeader,
} from '../../../shared/ui/components';
import { errorMessage } from '../../../shared/lib/http';
import type { Catalog, QuestionFilter } from '../../catalog/domain/catalog';
import { buildMockExam, IncompleteMockExamError } from '../application/build-mock-exam';

export function BuilderPage() {
  const { catalog } = useServices();
  const resource = useResource(useCallback((signal) => catalog.load(signal), [catalog]));
  return (
    <>
      <Link className="back-link" to="/simulados">
        <ArrowLeft size={16} />
        Meus simulados
      </Link>
      <PageHeader
        eyebrow="DO SEU JEITO, NO SEU RITMO"
        title="Qual é o foco de hoje?"
        description="Monte uma prática que faça sentido para o seu próximo passo."
      />
      {resource.loading ? (
        <Loading label="Preparando as possibilidades…" />
      ) : resource.error ? (
        <ErrorState error={resource.error} onRetry={resource.reload} />
      ) : (
        resource.data && <BuilderForm catalog={resource.data} />
      )}
    </>
  );
}
function BuilderForm({ catalog }: { catalog: Catalog }) {
  const { mockExams, catalog: catalogApi } = useServices();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<QuestionFilter>(() => {
    const topic = catalog.topics.find((item) => item.id === Number(search.get('topicId')));
    const subject =
      topic?.subject ??
      catalog.subjects.find((item) => item.id === Number(search.get('subjectId')));
    return {
      topicId: topic?.id,
      subjectId: subject?.id,
      knowledgeAreaId: subject?.knowledgeArea.id,
    };
  });
  const [name, setName] = useState('Meu simulado');
  const [numQuestions, setNumQuestions] = useState(10);
  const [maxTime, setMaxTime] = useState(30);
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const [error, setError] = useState<unknown>(null);
  const count = useResource(
    useCallback((signal) => catalogApi.count(filter, signal), [catalogApi, filter]),
  );
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy]);
  const subjects = catalog.subjects.filter(
    (subject) => !filter.knowledgeAreaId || subject.knowledgeArea.id === filter.knowledgeAreaId,
  );
  const topics = catalog.topics.filter((topic) => topic.subject.id === filter.subjectId);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await buildMockExam(mockExams, { name, numQuestions, maxTime }, filter);
      navigate(`/simulados/${result.mockExam.id}/execucao`, {
        state: { requestedCount: result.requestedCount },
      });
    } catch (failure) {
      setError(failure);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="builder-layout" onSubmit={submit}>
      <div className="builder-main">
        <section className="panel">
          <div className="section-heading">
            <div className="step-heading">
              <span className="step-number">01</span>
              <div>
                <h2>Escolha o que praticar</h2>
                <p className="muted text-small">Combine os filtros ou explore todas as questões.</p>
              </div>
            </div>
            <SlidersHorizontal size={21} className="muted" />
          </div>
          <fieldset disabled={busy} className="form-stack">
            <legend className="sr-only">Filtros das questões</legend>
            <label>
              Área de conhecimento
              <select
                value={filter.knowledgeAreaId ?? ''}
                onChange={(event) =>
                  setFilter({
                    ...filter,
                    knowledgeAreaId: Number(event.target.value) || undefined,
                    subjectId: undefined,
                    topicId: undefined,
                  })
                }
              >
                <option value="">Todas as áreas</option>
                {catalog.knowledgeAreas.map((area) => (
                  <option value={area.id} key={area.id}>
                    {area.description}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-columns">
              <label>
                Disciplina
                <select
                  value={filter.subjectId ?? ''}
                  onChange={(event) =>
                    setFilter({
                      ...filter,
                      subjectId: Number(event.target.value) || undefined,
                      topicId: undefined,
                    })
                  }
                >
                  <option value="">Todas as disciplinas</option>
                  {subjects.map((subject) => (
                    <option value={subject.id} key={subject.id}>
                      {subject.description}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Assunto
                <select
                  value={filter.topicId ?? ''}
                  disabled={busy || !filter.subjectId}
                  onChange={(event) =>
                    setFilter({ ...filter, topicId: Number(event.target.value) || undefined })
                  }
                >
                  <option value="">
                    {filter.subjectId ? 'Todos os assuntos' : 'Escolha uma disciplina'}
                  </option>
                  {topics.map((topic) => (
                    <option value={topic.id} key={topic.id}>
                      {topic.description}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Vestibular de origem
              <select
                value={filter.entranceExamId ?? ''}
                onChange={(event) =>
                  setFilter({ ...filter, entranceExamId: Number(event.target.value) || undefined })
                }
              >
                <option value="">Todos os vestibulares</option>
                {catalog.entranceExams.map((exam) => (
                  <option value={exam.id} key={exam.id}>
                    {exam.name} · {exam.year} · {exam.stage}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="field-label">Dificuldade</span>
              <div className="choice-row" role="group" aria-label="Dificuldade">
                {[
                  { value: undefined, label: 'Todas' },
                  { value: 1, label: 'Fácil' },
                  { value: 2, label: 'Média' },
                  { value: 3, label: 'Difícil' },
                ].map((item) => (
                  <button
                    key={item.label}
                    className={`choice-chip ${filter.difficulty === item.value ? 'choice-selected' : ''}`}
                    type="button"
                    aria-pressed={filter.difficulty === item.value}
                    onClick={() => setFilter({ ...filter, difficulty: item.value })}
                  >
                    {filter.difficulty === item.value && <Check size={14} />}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>
          <div className="catalog-count" role="status">
            <Layers size={17} />
            {count.loading ? (
              'Consultando questões disponíveis…'
            ) : count.error ? (
              <span>
                Não foi possível consultar a quantidade.{' '}
                <button className="text-link" type="button" onClick={count.reload}>
                  Tentar novamente
                </button>
              </span>
            ) : (
              <>
                <strong>{count.data}</strong> questões encontradas com estes filtros
              </>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="step-heading">
            <span className="step-number">02</span>
            <div>
              <h2>Dê o seu ritmo</h2>
              <p className="muted text-small">Você escolhe o tamanho do desafio.</p>
            </div>
          </div>
          <fieldset className="form-stack" disabled={busy}>
            <legend className="sr-only">Configuração do simulado</legend>
            <label>
              Nome do simulado
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={150}
                required
                placeholder="Ex.: Meu treino de Ciências da Natureza"
              />
            </label>
            <div className="form-columns">
              <label>
                Quantidade de questões
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={numQuestions || ''}
                  onChange={(event) => setNumQuestions(Number(event.target.value))}
                />
                <small>De 1 a 100 questões</small>
              </label>
              <label>
                Tempo máximo (minutos)
                <input
                  type="number"
                  min={1}
                  max={32767}
                  required
                  value={maxTime || ''}
                  onChange={(event) => setMaxTime(Number(event.target.value))}
                />
                <small>O cronômetro começa ao iniciar</small>
              </label>
            </div>
          </fieldset>
        </section>
      </div>
      <aside className="builder-summary panel">
        <span className="pill">SEU PRÓXIMO DESAFIO</span>
        <h2>{name.trim() || 'Meu simulado'}</h2>
        <div className="summary-number">
          <strong>{count.data == null ? numQuestions : Math.min(numQuestions, count.data)}</strong>
          <span>questões para ir além</span>
        </div>
        <div className="summary-detail">
          <Clock3 size={18} />
          <span>{maxTime || 0} minutos de concentração</span>
        </div>
        <div className="summary-detail">
          <Layers size={18} />
          <span>
            {catalog.subjects.find((item) => item.id === filter.subjectId)?.description ??
              catalog.knowledgeAreas.find((item) => item.id === filter.knowledgeAreaId)
                ?.description ??
              'Conhecimentos variados'}
          </span>
        </div>
        <hr />
        <p className="muted text-small">
          As questões são sorteadas com base nas suas escolhas. O resultado fica disponível ao
          finalizar.
        </p>
        {count.data != null && count.data < numQuestions && (
          <div className="notice">
            {count.data === 0
              ? 'Amplie os filtros para encontrar questões.'
              : `Encontramos ${count.data} questões. Seu simulado será criado com essa quantidade.`}
          </div>
        )}
        {error != null && (
          <ErrorBanner>
            {errorMessage(error)}
            {error instanceof IncompleteMockExamError && (
              <p>
                <Link to="/simulados">
                  Abrir histórico para remover o simulado #{error.mockExamId}
                </Link>
              </p>
            )}
          </ErrorBanner>
        )}
        <Button
          type="submit"
          className="button-full"
          busy={busy}
          disabled={count.data === 0 || !name.trim()}
        >
          {busy ? 'Montando seu simulado…' : 'Preparar simulado'}
          {!busy && <ArrowRight size={17} />}
        </Button>
        <p className="summary-footnote">
          <Check size={14} /> Você revisa antes de começar.
        </p>
      </aside>
    </form>
  );
}
