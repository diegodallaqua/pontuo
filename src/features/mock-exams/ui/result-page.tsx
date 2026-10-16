import { useCallback } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, Check, Clock3, Minus, Target, X } from 'lucide-react';
import { useServices } from '../../../app/services';
import { useResource } from '../../../shared/hooks/use-resource';
import {
  AccuracyBar,
  CreateMockExamLink,
  ErrorState,
  Loading,
  PageHeader,
} from '../../../shared/ui/components';
import { formatAccuracy, formatDate } from '../../../shared/lib/date';

export function ResultPage() {
  const { id } = useParams();
  const examId = Number(id);
  const { mockExams } = useServices();
  const resource = useResource(
    useCallback(
      async (signal: AbortSignal) => {
        if (!Number.isSafeInteger(examId) || examId < 1) throw new Error('Simulado inválido.');
        const result = await mockExams.result(examId, signal);
        const answers = result.mockExam.finishedAt
          ? await mockExams.answerResults(examId, signal)
          : [];
        return { ...result, answers };
      },
      [mockExams, examId],
    ),
  );
  if (resource.loading) return <Loading label="Reunindo suas conquistas…" />;
  if (resource.error) return <ErrorState error={resource.error} onRetry={resource.reload} />;
  if (!resource.data) return null;
  const { mockExam: exam, subjects, answers } = resource.data;
  if (!exam.finishedAt) return <Navigate to={`/simulados/${examId}/execucao`} replace />;
  const correct = exam.correctCount ?? 0;
  const answered = exam.answeredCount ?? 0;
  return (
    <>
      <Link to="/simulados" className="back-link">
        <ArrowLeft size={16} />
        Meus simulados
      </Link>
      <PageHeader
        eyebrow="MAIS UM PASSO DADO"
        title="Cada resultado ensina algo."
        description={`${exam.name} · Finalizado em ${formatDate(exam.finishedAt)}`}
        action={<CreateMockExamLink />}
      />
      <section className="result-hero">
        <div
          className="result-ring"
          style={{ '--accuracy': `${exam.accuracy ?? 0}%` } as React.CSSProperties}
        >
          <div>
            <strong>{formatAccuracy(exam.accuracy)}</strong>
            <span>de aproveitamento</span>
          </div>
        </div>
        <div className="result-message">
          <span className="pill pill-dark">
            <Check size={14} /> SIMULADO CONCLUÍDO
          </span>
          <h2>
            {(exam.accuracy ?? 0) >= 70
              ? 'Seu esforço está dando resultado.'
              : 'Você já sabe por onde continuar.'}
          </h2>
          <p>
            {(exam.accuracy ?? 0) >= 70
              ? 'Reconheça seu progresso e continue praticando. Cada novo desafio fortalece o que você aprendeu.'
              : 'Um resultado é um ponto de partida. Olhe para cada disciplina e transforme essa experiência no seu próximo passo.'}
          </p>
          <Link to="/desempenho" className="hero-link">
            Entender meu desempenho
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <div className="result-stats">
        <article>
          <span className="result-stat-icon success">
            <Check size={21} />
          </span>
          <div>
            <strong>{correct}</strong>
            <span>Acertos</span>
          </div>
        </article>
        <article>
          <span className="result-stat-icon danger">
            <X size={21} />
          </span>
          <div>
            <strong>{answered - correct}</strong>
            <span>Erros</span>
          </div>
        </article>
        <article>
          <span className="result-stat-icon neutral">
            <Minus size={21} />
          </span>
          <div>
            <strong>{exam.numQuestions - answered}</strong>
            <span>Em branco</span>
          </div>
        </article>
        <article>
          <span className="result-stat-icon accent">
            <Target size={21} />
          </span>
          <div>
            <strong>{exam.numQuestions}</strong>
            <span>Questões no total</span>
          </div>
        </article>
      </div>
      <div className="two-columns">
        <section className="panel">
          <div className="section-heading">
            <h2>Seu resultado por disciplina</h2>
            <Target size={20} className="muted" />
          </div>
          {subjects.length ? (
            <div className="breakdown-list">
              {subjects.map((subject) => (
                <AccuracyBar
                  key={subject.id}
                  label={subject.description ?? 'Disciplina'}
                  value={subject.accuracy}
                  detail={`${subject.correct} acertos em ${subject.questions} questões`}
                />
              ))}
            </div>
          ) : (
            <p className="muted">Não há questões classificadas por disciplina neste simulado.</p>
          )}
        </section>
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Conferência das respostas</h2>
              <p className="muted text-small">
                Sua alternativa marcada e a correção de cada questão.
              </p>
            </div>
          </div>
          <div className="answer-key-grid">
            {answers.map((answer, index) => (
              <div
                key={answer.id}
                className={`answer-key-item ${answer.answerLetter === null ? 'key-blank' : answer.correct ? 'key-correct' : 'key-incorrect'}`}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{answer.answerLetter ?? '—'}</strong>
                {answer.answerLetter === null ? (
                  <Minus size={14} />
                ) : answer.correct ? (
                  <Check size={14} />
                ) : (
                  <X size={14} />
                )}
                <span className="sr-only">
                  {answer.answerLetter === null
                    ? 'Em branco'
                    : answer.correct
                      ? 'Correta'
                      : 'Incorreta'}
                </span>
              </div>
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
          <p className="muted text-small result-note">
            <Clock3 size={15} />
            Questões em branco contam no total do aproveitamento.
          </p>
        </section>
      </div>
    </>
  );
}
