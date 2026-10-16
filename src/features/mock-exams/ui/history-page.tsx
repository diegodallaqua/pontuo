import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import { useServices } from '../../../app/services';
import { useAuth } from '../../auth/application/auth-context';
import { useResource } from '../../../shared/hooks/use-resource';
import {
  Button,
  CreateMockExamLink,
  EmptyState,
  ErrorBanner,
  ErrorState,
  Loading,
  Modal,
  PageHeader,
} from '../../../shared/ui/components';
import { ApiError, errorMessage } from '../../../shared/lib/http';
import { formatAccuracy, formatDate } from '../../../shared/lib/date';
import {
  mockExamStatus,
  statusLabels,
  type MockExam,
  type MockExamStatus,
} from '../domain/mock-exam';

export function HistoryPage() {
  const { mockExams } = useServices();
  const { user } = useAuth();
  const resource = useResource(
    useCallback(
      async (signal: AbortSignal) =>
        (await mockExams.list(user!.id, signal)).sort((a, b) => b.id - a.id),
      [mockExams, user],
    ),
  );
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MockExamStatus | 'all'>('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<{ exam: MockExam; action: 'edit' | 'delete' } | null>(
    null,
  );
  const [notice, setNotice] = useState('');
  useEffect(() => {
    setPage(0);
  }, [search, status]);
  const filtered =
    resource.data?.filter(
      (exam) =>
        (status === 'all' || mockExamStatus(exam) === status) &&
        exam.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')),
    ) ?? [];
  const pages = Math.max(1, Math.ceil(filtered.length / 9));
  const currentPage = Math.min(page, pages - 1);
  function updated(message: string) {
    setSelected(null);
    setNotice(message);
    resource.reload();
  }
  return (
    <>
      <PageHeader
        eyebrow="SUA PRÁTICA, SEU CAMINHO"
        title="Cada tentativa faz diferença."
        description="Retome de onde parou ou veja o quanto já caminhou."
        action={<CreateMockExamLink />}
      />
      {notice && (
        <div className="notice notice-success" role="status">
          {notice}
        </div>
      )}
      <div className="history-toolbar">
        <div className="status-tabs" role="group" aria-label="Filtrar por situação">
          {(
            [
              { value: 'all', label: 'Todos' },
              { value: 'active', label: 'Em andamento' },
              { value: 'ready', label: 'Prontos' },
              { value: 'finished', label: 'Finalizados' },
            ] as const
          ).map((item) => (
            <button
              className={status === item.value ? 'tab-active' : ''}
              aria-pressed={status === item.value}
              key={item.value}
              onClick={() => setStatus(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={17} />
          <span className="sr-only">Buscar simulado</span>
          <input
            placeholder="Buscar pelo nome…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorState error={resource.error} onRetry={resource.reload} />
      ) : !filtered.length ? (
        <section className="panel">
          <EmptyState
            title={
              resource.data?.length ? 'Nenhum simulado neste recorte' : 'O primeiro passo é seu.'
            }
            description={
              resource.data?.length
                ? 'Experimente outro nome ou outra situação.'
                : 'Escolha o que quer praticar e prepare seu primeiro simulado.'
            }
            action={
              resource.data?.length ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setStatus('all');
                  }}
                >
                  Limpar filtros
                </Button>
              ) : (
                <CreateMockExamLink />
              )
            }
          />
        </section>
      ) : (
        <>
          <div className="history-grid">
            {filtered.slice(currentPage * 9, currentPage * 9 + 9).map((exam) => {
              const examStatus = mockExamStatus(exam);
              return (
                <article className="panel history-card" key={exam.id}>
                  <div className="history-card-top">
                    <span className={`status-badge status-${examStatus}`}>
                      {statusLabels[examStatus]}
                    </span>
                    <div className="history-card-tools">
                      {examStatus !== 'finished' && (
                        <button
                          className="icon-button"
                          aria-label={`Editar ${exam.name}`}
                          onClick={() => setSelected({ exam, action: 'edit' })}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      <button
                        className="icon-button"
                        aria-label={`Excluir ${exam.name}`}
                        onClick={() => setSelected({ exam, action: 'delete' })}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <span className="history-card-date">{formatDate(exam.createdAt)}</span>
                  <h2>{exam.name}</h2>
                  <div className="exam-facts">
                    <span>
                      <FileText size={15} />
                      {exam.numQuestions} questões
                    </span>
                    <span>
                      <Clock3 size={15} />
                      {exam.maxTime} min
                    </span>
                  </div>
                  <div className="history-card-bottom">
                    <div>
                      <span>
                        {examStatus === 'finished' ? 'Aproveitamento' : 'Seu próximo passo'}
                      </span>
                      <strong>
                        {examStatus === 'finished'
                          ? formatAccuracy(exam.accuracy)
                          : examStatus === 'active'
                            ? 'Continue de onde parou'
                            : 'Tudo pronto para começar'}
                      </strong>
                    </div>
                    <Link
                      className="round-link"
                      to={`/simulados/${exam.id}/${examStatus === 'finished' ? 'resultado' : 'execucao'}`}
                      aria-label={`${examStatus === 'finished' ? 'Ver resultado de' : 'Abrir'} ${exam.name}`}
                    >
                      <ArrowUpRight size={21} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="pagination">
            <span>
              {filtered.length} simulados · Página {currentPage + 1} de {pages}
            </span>
            <div>
              <Button
                variant="secondary"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
                aria-label="Página anterior"
              >
                <ChevronLeft size={17} />
              </Button>
              <Button
                variant="secondary"
                disabled={currentPage >= pages - 1}
                onClick={() => setPage(currentPage + 1)}
                aria-label="Próxima página"
              >
                <ChevronRight size={17} />
              </Button>
            </div>
          </div>
        </>
      )}
      {selected && (
        <HistoryDialog
          key={`${selected.exam.id}-${selected.action}`}
          exam={selected.exam}
          action={selected.action}
          onClose={() => setSelected(null)}
          onUpdated={updated}
        />
      )}
    </>
  );
}
function HistoryDialog({
  exam,
  action,
  onClose,
  onUpdated,
}: {
  exam: MockExam;
  action: 'edit' | 'delete';
  onClose: () => void;
  onUpdated: (message: string) => void;
}) {
  const { mockExams } = useServices();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      if (action === 'delete') await mockExams.remove(exam.id);
      else
        await mockExams.update(exam.id, {
          name: String(data.get('name')).trim(),
          numQuestions: exam.numQuestions,
          maxTime: exam.startedAt ? exam.maxTime : Number(data.get('maxTime')),
        });
      onUpdated(
        action === 'delete'
          ? 'Simulado excluído. Sua análise será recalculada.'
          : 'Simulado atualizado.',
      );
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 409)
        onUpdated('O simulado foi alterado em outra sessão. A lista foi atualizada.');
      else setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={action === 'delete' ? 'Excluir este simulado?' : 'Ajustar seu simulado'}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit} className="form-stack">
        {action === 'delete' ? (
          <>
            <p>
              O simulado <strong>{exam.name}</strong> e todas as suas respostas serão excluídos.
            </p>
            <p className="muted">
              Esta ação não pode ser desfeita. O resultado deixará de contar na análise de
              desempenho.
            </p>
          </>
        ) : (
          <>
            <label>
              Nome do simulado
              <input name="name" defaultValue={exam.name} maxLength={150} required />
            </label>
            <label>
              Tempo máximo (minutos)
              <input
                name="maxTime"
                type="number"
                min={1}
                max={32767}
                defaultValue={exam.maxTime}
                required
                readOnly={!!exam.startedAt}
              />
            </label>
            {exam.startedAt && (
              <p className="muted text-small">O tempo fica preservado depois do início da prova.</p>
            )}
          </>
        )}
        {error != null && <ErrorBanner>{errorMessage(error)}</ErrorBanner>}
        <div className="modal-actions">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant={action === 'delete' ? 'danger' : 'primary'} busy={busy}>
            {action === 'delete' ? 'Excluir simulado' : 'Salvar alterações'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
