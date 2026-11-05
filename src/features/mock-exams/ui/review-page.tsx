import { useCallback } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, Check, Lightbulb, Minus, X } from 'lucide-react';
import { useServices } from '../../../app/services';
import { useResource } from '../../../shared/hooks/use-resource';
import { Button, EmptyState, ErrorState, Loading, PageHeader } from '../../../shared/ui/components';
import { questionSubject } from '../../catalog/domain/catalog';
import { loadReview } from '../application/load-result';
import {
  answerKeyChanged,
  reviewOutcome,
  type ReviewItem,
  type ReviewOutcome,
} from '../domain/mock-exam';
import { QuestionFigure } from './question-figure';

const outcomeLabels: Record<ReviewOutcome, string> = {
  correct: 'Você acertou',
  incorrect: 'Você errou',
  blank: 'Em branco',
};
const outcomeIcons = { correct: Check, incorrect: X, blank: Minus };
const amount = (value: number, one: string, many: string) => `${value} ${value === 1 ? one : many}`;

export function ReviewPage() {
  const { id } = useParams();
  const examId = Number(id);
  const { mockExams } = useServices();
  const [params, setParams] = useSearchParams();
  const resource = useResource(
    useCallback(
      async (signal: AbortSignal) => {
        if (!Number.isSafeInteger(examId) || examId < 1) throw new Error('Simulado inválido.');
        return loadReview(mockExams, examId, signal);
      },
      [mockExams, examId],
    ),
  );
  if (resource.loading) return <Loading label="Preparando a revisão…" />;
  if (resource.error) return <ErrorState error={resource.error} onRetry={resource.reload} />;
  if (!resource.data) return null;
  const { mockExam: exam, questions } = resource.data;
  if (!exam.finishedAt) return <Navigate to={`/simulados/${examId}/execucao`} replace />;
  const back = (
    <Link to={`/simulados/${examId}/resultado`} className="back-link">
      <ArrowLeft size={16} />
      Resultado do simulado
    </Link>
  );
  if (!questions.length)
    return (
      <>
        {back}
        <section className="panel">
          <EmptyState
            title="Nada para revisar"
            description="Este simulado não tem questões vinculadas."
          />
        </section>
      </>
    );
  // A questão fica na URL: recarregar ou vir da conferência abre a mesma questão.
  const requested = Number(params.get('questao'));
  const index = Number.isSafeInteger(requested)
    ? Math.min(Math.max(requested, 1), questions.length) - 1
    : 0;
  const go = (next: number) => setParams({ questao: String(next + 1) }, { replace: true });
  const item = questions[index]!;
  const outcomes = questions.map(reviewOutcome);
  const count = (outcome: ReviewOutcome) => outcomes.filter((value) => value === outcome).length;
  const correct = amount(count('correct'), 'acerto', 'acertos');
  return (
    <>
      {back}
      <PageHeader
        eyebrow="REVISÃO DO SIMULADO"
        title="Cada questão ensina um caminho."
        description={`${exam.name} · ${correct} em ${amount(questions.length, 'questão', 'questões')}`}
      />
      <div className="session-layout">
        <ReviewQuestionPanel item={item} index={index} total={questions.length} onGo={go} />
        <aside className="panel question-map">
          <h2>Suas respostas</h2>
          <p className="muted text-small">
            {correct} · {amount(count('incorrect'), 'erro', 'erros')} · {count('blank')} em branco
          </p>
          <div className="question-grid">
            {questions.map((question, position) => (
              <button
                key={question.id}
                className={`question-number review-${outcomes[position]} ${position === index ? 'question-current' : ''}`}
                aria-label={`Questão ${position + 1}: ${outcomeLabels[outcomes[position]!].toLocaleLowerCase('pt-BR')}`}
                aria-current={position === index ? 'step' : undefined}
                onClick={() => go(position)}
              >
                {position + 1}
              </button>
            ))}
          </div>
          <div className="map-legend">
            <span>
              <i className="legend-correct" />
              Acerto
            </span>
            <span>
              <i className="legend-incorrect" />
              Erro
            </span>
            <span>
              <i />
              Em branco
            </span>
          </div>
        </aside>
      </div>
    </>
  );
}

function ReviewQuestionPanel({
  item,
  index,
  total,
  onGo,
}: {
  item: ReviewItem;
  index: number;
  total: number;
  onGo: (index: number) => void;
}) {
  const { question } = item;
  const outcome = reviewOutcome(item);
  const OutcomeIcon = outcomeIcons[outcome];
  return (
    <section className="panel question-panel">
      <div className="question-meta">
        <span className="pill">QUESTÃO {String(index + 1).padStart(2, '0')}</span>
        <span>{questionSubject(question)?.description ?? 'Conhecimentos gerais'}</span>
        <span>
          {question.entranceExam
            ? `${question.entranceExam.name} · ${question.entranceExam.year}`
            : ''}
        </span>
        <span className={`review-verdict review-${outcome}`}>
          <OutcomeIcon size={14} />
          {outcomeLabels[outcome]}
        </span>
      </div>
      <h2 className="sr-only">Questão {index + 1}</h2>
      <p className="question-statement">{question.statement}</p>
      {question.images.map((image) => (
        <QuestionFigure key={image.id} image={image} />
      ))}
      <ol className="answer-options review-options" aria-label="Alternativas">
        {question.answerOptions.map((option) => {
          const selected = option.id === item.selectedAnswerOptionId;
          return (
            <li
              key={option.id}
              className={`answer-option ${option.rightAnswer ? 'review-right' : selected ? 'review-wrong' : ''}`}
            >
              <span className="answer-letter">{option.letter}</span>
              <span className="answer-text">{option.text}</span>
              {(selected || option.rightAnswer) && (
                <span className="review-tags">
                  {selected && <span className="review-tag">Sua resposta</span>}
                  {option.rightAnswer && (
                    <span className="review-tag review-tag-right">
                      <Check size={12} />
                      Correta
                    </span>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {answerKeyChanged(item) && (
        <div className="notice" role="note">
          O gabarito desta questão foi corrigido depois da sua prova. Sua nota mantém a correção da
          época da finalização.
        </div>
      )}
      <section className="review-explanation">
        <h3>
          <Lightbulb size={17} />
          Resolução comentada
        </h3>
        {question.explanation ? (
          <p>{question.explanation}</p>
        ) : (
          <p className="muted">Esta questão ainda não tem resolução comentada.</p>
        )}
      </section>
      <div className="question-actions">
        <Button variant="secondary" disabled={index === 0} onClick={() => onGo(index - 1)}>
          <ArrowLeft size={17} />
          Anterior
        </Button>
        <span className="muted text-small">
          {index + 1} de {total}
        </span>
        <Button disabled={index === total - 1} onClick={() => onGo(index + 1)}>
          Próxima
          <ArrowRight size={17} />
        </Button>
      </div>
    </section>
  );
}
