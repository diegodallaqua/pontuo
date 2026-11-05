import { useCallback, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Check, Save } from 'lucide-react';
import { useServices } from '../../../app/services';
import { useResource } from '../../../shared/hooks/use-resource';
import { ApiError } from '../../../shared/lib/http';
import { Button, ErrorState, Loading, PageHeader } from '../../../shared/ui/components';
import {
  difficultyLabels,
  questionSubject,
  type KnowledgeArea,
  type Subject,
} from '../../catalog/domain/catalog';
import { classifyQuestion, type AdminEntranceExam, type AdminQuestion } from '../domain/admin';
import { SubjectOptions } from './fields';
import { optionalText, RequestError, textField } from './form-dialog';
import { AnswerOptionsPanel, QuestionImagesPanel } from './question-content-panels';

interface References {
  knowledgeAreas: KnowledgeArea[];
  subjects: Subject[];
  entranceExams: AdminEntranceExam[];
}

export function QuestionEditorPage() {
  const { id } = useParams();
  const { admin } = useServices();
  const location = useLocation();
  const questionId = id === undefined ? null : Number(id);
  const resource = useResource(
    useCallback(
      async (signal: AbortSignal) => {
        if (questionId !== null && !(Number.isSafeInteger(questionId) && questionId > 0))
          throw new ApiError('O conteúdo solicitado não foi encontrado.', 404);
        const [knowledgeAreas, subjects, entranceExams, question] = await Promise.all([
          admin.knowledgeAreas.all({}, signal),
          admin.subjects.all({}, signal),
          admin.entranceExams.all({}, signal),
          questionId === null ? null : admin.questions.get(questionId, signal),
        ]);
        return { references: { knowledgeAreas, subjects, entranceExams }, question };
      },
      [admin, questionId],
    ),
  );
  const notice = (location.state as { notice?: string } | null)?.notice;
  return (
    <>
      <Link className="back-link" to="/admin/questoes">
        <ArrowLeft size={16} />
        Banco de questões
      </Link>
      <PageHeader
        eyebrow="BANCO DE QUESTÕES"
        title={questionId === null ? 'Nova questão' : `Questão #${questionId}`}
        description={
          questionId === null
            ? 'Comece pelo enunciado. Alternativas e imagens ficam disponíveis depois de salvar.'
            : 'Revise o enunciado, o gabarito e as imagens que acompanham a questão.'
        }
      />
      {notice && (
        <div className="notice notice-success" role="status">
          {notice}
        </div>
      )}
      {resource.loading ? (
        <Loading label="Abrindo a questão…" />
      ) : resource.error ? (
        <ErrorState error={resource.error} onRetry={resource.reload} />
      ) : (
        resource.data && (
          <>
            <QuestionForm question={resource.data.question} references={resource.data.references} />
            {resource.data.question && (
              <div className="two-columns admin-question-content">
                <AnswerOptionsPanel questionId={resource.data.question.id} />
                <QuestionImagesPanel questionId={resource.data.question.id} />
              </div>
            )}
          </>
        )
      )}
    </>
  );
}

function QuestionForm({
  question,
  references,
}: {
  question: AdminQuestion | null;
  references: References;
}) {
  const { admin } = useServices();
  const navigate = useNavigate();
  const initialSubject = question && questionSubject(question);
  const [knowledgeAreaId, setKnowledgeAreaId] = useState(initialSubject?.knowledgeArea.id ?? 0);
  const [subjectId, setSubjectId] = useState(initialSubject?.id ?? 0);
  const [topicId, setTopicId] = useState(question?.topic?.id ?? 0);
  const [difficulty, setDifficulty] = useState(question?.difficulty ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const topics = useResource(
    useCallback(
      (signal: AbortSignal) =>
        subjectId ? admin.topics.all({ subjectId }, signal) : Promise.resolve([]),
      [admin, subjectId],
    ),
  );
  const subjects = references.subjects.filter(
    (subject) => !knowledgeAreaId || subject.knowledgeArea.id === knowledgeAreaId,
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const result = await admin.questions.save(question?.id ?? null, {
        statement: textField(data, 'statement'),
        explanation: optionalText(data, 'explanation'),
        difficulty,
        entranceExamId: Number(data.get('entranceExamId')),
        ...classifyQuestion(subjectId || null, topicId || null),
      });
      if (question) setSaved(true);
      else
        navigate(`/admin/questoes/${result.id}`, {
          replace: true,
          state: { notice: 'Questão criada. Agora cadastre as alternativas e marque a correta.' },
        });
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel" onSubmit={submit}>
      <div className="step-heading">
        <span className="step-number">01</span>
        <div>
          <h2>Enunciado e classificação</h2>
          <p className="muted text-small">
            O que o estudante lê e como a questão entra nos filtros.
          </p>
        </div>
      </div>
      <fieldset className="form-stack" disabled={busy}>
        <legend className="sr-only">Dados da questão</legend>
        <label>
          Enunciado
          <textarea name="statement" rows={7} defaultValue={question?.statement} required />
        </label>
        <label>
          Resolução comentada
          <textarea
            name="explanation"
            rows={4}
            defaultValue={question?.explanation ?? ''}
            placeholder="Opcional. A API só a libera ao estudante depois que o simulado é finalizado."
          />
        </label>
        <div className="form-columns">
          <label>
            Vestibular de origem
            <select name="entranceExamId" defaultValue={question?.entranceExam.id ?? ''} required>
              <option value="">Selecione</option>
              {references.entranceExams.map((exam) => (
                <option value={exam.id} key={exam.id}>
                  {exam.name} · {exam.year} · {exam.stage}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="field-label">Dificuldade</span>
            <div className="choice-row" role="group" aria-label="Dificuldade">
              {[null, 1, 2, 3].map((value) => (
                <button
                  key={value ?? 'none'}
                  type="button"
                  className={`choice-chip ${difficulty === value ? 'choice-selected' : ''}`}
                  aria-pressed={difficulty === value}
                  onClick={() => setDifficulty(value)}
                >
                  {difficulty === value && <Check size={14} />}
                  {value === null ? 'Não informada' : difficultyLabels[value]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="admin-classification">
          <label>
            Área de conhecimento
            <select
              value={knowledgeAreaId || ''}
              onChange={(event) => {
                setKnowledgeAreaId(Number(event.target.value));
                setSubjectId(0);
                setTopicId(0);
              }}
            >
              <option value="">Todas as áreas</option>
              {references.knowledgeAreas.map((area) => (
                <option value={area.id} key={area.id}>
                  {area.description}
                </option>
              ))}
            </select>
          </label>
          <label>
            Disciplina
            <select
              value={subjectId || ''}
              required
              onChange={(event) => {
                setSubjectId(Number(event.target.value));
                setTopicId(0);
              }}
            >
              <option value="">Selecione</option>
              <SubjectOptions subjects={subjects} />
            </select>
          </label>
          <label>
            Assunto
            <select
              value={topicId || ''}
              disabled={!subjectId || topics.loading}
              onChange={(event) => setTopicId(Number(event.target.value))}
            >
              <option value="">
                {topics.loading ? 'Carregando assuntos…' : 'Somente a disciplina'}
              </option>
              {topics.data?.map((topic) => (
                <option value={topic.id} key={topic.id}>
                  {topic.description}
                </option>
              ))}
            </select>
            <small>
              {topics.error
                ? 'Não foi possível carregar os assuntos desta disciplina.'
                : 'Com assunto, a disciplina é deduzida dele.'}
            </small>
          </label>
        </div>
      </fieldset>
      {error != null && <RequestError error={error} />}
      <div className="admin-form-actions">
        {saved && (
          <span className="notice-inline" role="status">
            <Check size={15} /> Alterações salvas
          </span>
        )}
        <Button type="submit" busy={busy}>
          {!busy && <Save size={17} />}
          {question ? 'Salvar questão' : 'Criar questão'}
        </Button>
      </div>
    </form>
  );
}
