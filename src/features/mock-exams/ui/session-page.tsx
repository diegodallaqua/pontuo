import { useCallback, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, Flag, Play, ShieldCheck } from 'lucide-react';
import { Link, Navigate, useLocation, useParams } from 'react-router';
import { useServices } from '../../../app/services';
import { useResource } from '../../../shared/hooks/use-resource';
import {
  Button,
  ErrorBanner,
  ErrorState,
  Loading,
  Modal,
  PageHeader,
} from '../../../shared/ui/components';
import { errorMessage } from '../../../shared/lib/http';
import { formatTimer } from '../../../shared/lib/date';
import { questionSubject, type QuestionImage } from '../../catalog/domain/catalog';
import type { MockExamSession } from '../domain/mock-exam';
import { useExamRunner } from '../application/use-exam-runner';

function QuestionFigure({ image }: { image: QuestionImage }) {
  const [failed, setFailed] = useState(false);
  const safe =
    /^https?:\/\//i.test(image.url) || (image.url.startsWith('/') && !image.url.startsWith('//'));
  return (
    <figure>
      {safe && !failed ? (
        <img
          src={image.url}
          alt={image.subtitle || 'Imagem que integra o enunciado da questão'}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="notice" role="status">
          A imagem desta questão não pôde ser carregada.
        </div>
      )}
      {image.subtitle && <figcaption>{image.subtitle}</figcaption>}
    </figure>
  );
}
export function SessionPage() {
  const { id } = useParams();
  const { mockExams } = useServices();
  const examId = Number(id);
  const resource = useResource(
    useCallback(
      (signal: AbortSignal) => {
        if (!Number.isSafeInteger(examId) || examId < 1)
          return Promise.reject(
            new Error('Simulado inválido. Volte ao histórico e escolha um simulado.'),
          );
        return mockExams.loadSession(examId, signal);
      },
      [mockExams, examId],
    ),
  );
  if (resource.loading) return <Loading label="Preparando suas questões…" />;
  if (resource.error) return <ErrorState error={resource.error} onRetry={resource.reload} />;
  if (!resource.data) return null;
  if (resource.data.mockExam.finishedAt)
    return <Navigate to={`/simulados/${examId}/resultado`} replace />;
  if (
    resource.data.questions.length !== resource.data.mockExam.numQuestions ||
    !resource.data.questions.length ||
    resource.data.questions.some((link) => link.question.answerOptions.length < 2)
  ) {
    return (
      <section className="panel">
        <ErrorState
          error={
            new Error(
              'Este simulado está incompleto ou contém questões sem alternativas. Exclua-o pelo histórico e prepare um novo simulado.',
            )
          }
        />
        <Link className="button button-secondary" to="/simulados">
          Ir para o histórico
        </Link>
      </section>
    );
  }
  return <ExamSession initial={resource.data} reload={resource.reload} />;
}
function ExamSession({ initial, reload }: { initial: MockExamSession; reload: () => void }) {
  const runner = useExamRunner(initial, reload);
  const { session, index, saving, busy, error, remaining, expired } = runner;
  const [confirm, setConfirm] = useState(false);
  const location = useLocation();
  const requestedCount = (location.state as { requestedCount?: number } | null)?.requestedCount;
  const exam = session.mockExam;
  const current = session.questions[index]!;
  const answered = session.questions.filter((link) => link.answerOptionId !== null).length;
  if (!exam.startedAt)
    return (
      <>
        <Link className="back-link" to="/simulados">
          <ArrowLeft size={16} />
          Meus simulados
        </Link>
        <PageHeader
          eyebrow="TUDO PRONTO"
          title="Um momento para se concentrar."
          description="Organize seu espaço. O próximo passo é seu."
        />
        <section className="start-panel panel">
          <span className="start-icon">
            <Play size={30} />
          </span>
          <h2>{exam.name}</h2>
          <p className="muted">Sem pressa para começar. Com foco para ir além.</p>
          <div className="start-facts">
            <div>
              <strong>{exam.numQuestions}</strong>
              <span>questões</span>
            </div>
            <div>
              <strong>{exam.maxTime}</strong>
              <span>minutos</span>
            </div>
          </div>
          <ul className="start-tips">
            <li>
              <Check size={17} />
              Suas respostas são salvas ao selecionar uma alternativa.
            </li>
            <li>
              <Check size={17} />
              Você pode voltar às questões enquanto o tempo estiver correndo.
            </li>
            <li>
              <Check size={17} />
              Ao finalizar, veja seu resultado e desempenho por disciplina.
            </li>
          </ul>
          {requestedCount != null && requestedCount > exam.numQuestions && (
            <div className="notice">
              Seu recorte tinha {exam.numQuestions} das {requestedCount} questões solicitadas. O
              simulado foi ajustado à quantidade disponível.
            </div>
          )}
          {error != null && <ErrorBanner>{errorMessage(error)}</ErrorBanner>}
          <Button busy={busy} onClick={runner.start}>
            Começar simulado
            <ArrowRight size={18} />
          </Button>
          <p className="muted text-small">O cronômetro continua mesmo se você sair da página.</p>
        </section>
      </>
    );
  return (
    <>
      <div className="session-top">
        <div>
          <p className="eyebrow">FOCO NO SEU PRÓXIMO PASSO</p>
          <h1>{exam.name}</h1>
        </div>
        <div
          className={`exam-timer ${remaining <= 300 ? 'timer-warning' : ''}`}
          aria-label={`Tempo restante: ${formatTimer(remaining)}`}
        >
          <Clock3 size={20} />
          <strong>{formatTimer(remaining)}</strong>
          <span>restantes</span>
        </div>
      </div>
      {expired && (
        <div className="notice" role="status">
          O tempo terminou.{' '}
          {busy
            ? 'Finalizando seu simulado…'
            : 'As respostas estão bloqueadas. Se a finalização falhar, use o botão para tentar novamente.'}
        </div>
      )}
      {error != null && (
        <ErrorBanner>
          {errorMessage(error)} Sua última resposta confirmada foi preservada.
        </ErrorBanner>
      )}
      <div className="session-layout">
        <section className="panel question-panel">
          <div className="question-meta">
            <span className="pill">QUESTÃO {String(index + 1).padStart(2, '0')}</span>
            <span>{questionSubject(current.question)?.description ?? 'Conhecimentos gerais'}</span>
            <span>
              {current.question.entranceExam
                ? `${current.question.entranceExam.name} · ${current.question.entranceExam.year}`
                : ''}
            </span>
          </div>
          <h2 className="sr-only">Questão {index + 1}</h2>
          <p className="question-statement">{current.question.statement}</p>
          {current.question.images.map((image) => (
            <QuestionFigure key={image.id} image={image} />
          ))}
          <fieldset className="answer-options" disabled={saving || busy || expired}>
            <legend>Selecione uma alternativa</legend>
            {current.question.answerOptions.map((option) => (
              <label
                key={option.id}
                className={`answer-option ${current.answerOptionId === option.id ? 'answer-selected' : ''}`}
              >
                <input
                  type="radio"
                  name={`question-${current.id}`}
                  value={option.id}
                  checked={current.answerOptionId === option.id}
                  onChange={() => void runner.answer(option.id)}
                />
                <span className="answer-letter">{option.letter}</span>
                <span className="answer-text">{option.text}</span>
                {current.answerOptionId === option.id && <Check size={19} className="accent" />}
              </label>
            ))}
          </fieldset>
          <div className="answer-status">
            <span role="status">
              <ShieldCheck size={15} />
              {saving
                ? 'Salvando resposta…'
                : current.answerOptionId !== null
                  ? 'Resposta salva'
                  : 'Ainda não respondida'}
            </span>
            <button
              className="text-link"
              disabled={saving || busy || expired || current.answerOptionId === null}
              onClick={() => void runner.answer(null)}
            >
              Limpar resposta
            </button>
          </div>
          <div className="question-actions">
            <Button
              variant="secondary"
              disabled={index === 0 || busy}
              onClick={() => runner.setIndex((value) => value - 1)}
            >
              <ArrowLeft size={17} />
              Anterior
            </Button>
            <span className="muted text-small">
              {index + 1} de {session.questions.length}
            </span>
            {index < session.questions.length - 1 ? (
              <Button onClick={() => runner.setIndex((value) => value + 1)} disabled={busy}>
                Próxima
                <ArrowRight size={17} />
              </Button>
            ) : (
              <Button onClick={() => setConfirm(true)} disabled={saving || busy}>
                Finalizar
                <Flag size={17} />
              </Button>
            )}
          </div>
        </section>
        <aside className="panel question-map">
          <h2>Seu progresso</h2>
          <p className="muted text-small">
            {answered} de {exam.numQuestions} respondidas
          </p>
          <progress value={answered} max={exam.numQuestions} aria-label="Questões respondidas" />
          <nav className="question-grid" aria-label="Navegar pelas questões">
            {session.questions.map((link, position) => (
              <button
                key={link.id}
                className={`question-number ${link.answerOptionId !== null ? 'question-answered' : ''} ${position === index ? 'question-current' : ''}`}
                aria-label={`Questão ${position + 1}${link.answerOptionId !== null ? ', respondida' : ', em branco'}`}
                aria-current={position === index ? 'step' : undefined}
                onClick={() => runner.setIndex(position)}
                disabled={busy}
              >
                {position + 1}
              </button>
            ))}
          </nav>
          <div className="map-legend">
            <span>
              <i className="legend-answered" />
              Respondida
            </span>
            <span>
              <i />
              Em branco
            </span>
          </div>
          <hr />
          <Button
            variant="secondary"
            className="button-full"
            busy={busy}
            disabled={saving}
            onClick={() => setConfirm(true)}
          >
            <Flag size={16} />
            Finalizar simulado
          </Button>
          <p className="muted text-small">Pode voltar e mudar suas respostas até finalizar.</p>
        </aside>
      </div>
      {confirm && (
        <Modal
          title="Finalizar seu simulado?"
          busy={busy || saving}
          onClose={() => setConfirm(false)}
        >
          <p>
            Você respondeu{' '}
            <strong>
              {answered} de {exam.numQuestions}
            </strong>{' '}
            questões.
          </p>
          {answered < exam.numQuestions && (
            <div className="notice">
              {exam.numQuestions - answered} questões ficarão em branco e entrarão no cálculo do
              aproveitamento.
            </div>
          )}
          <p className="muted">
            Depois da finalização, as respostas ficam registradas e não podem ser alteradas.
          </p>
          {error != null && <ErrorBanner>{errorMessage(error)}</ErrorBanner>}
          <div className="modal-actions">
            <Button
              variant="secondary"
              disabled={busy || expired}
              onClick={() => setConfirm(false)}
            >
              Continuar respondendo
            </Button>
            <Button busy={busy} disabled={saving} onClick={() => void runner.finish()}>
              Finalizar e ver resultado
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
