import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { useServices } from '../../../app/services';
import { useResource } from '../../../shared/hooks/use-resource';
import { PageHeader } from '../../../shared/ui/components';
import { difficultyLabels, type QuestionFilter } from '../../catalog/domain/catalog';
import { useAdminList } from '../application/use-admin-list';
import { classificationLabel, type AdminQuestion } from '../domain/admin';
import { AdminTable, RowActions, SearchField } from './admin-table';
import { FilterSelect, SubjectOptions } from './fields';
import { DeleteDialog } from './form-dialog';

export function QuestionsAdminPage() {
  const { admin } = useServices();
  const references = useResource(
    useCallback(
      async (signal: AbortSignal) => {
        const [subjects, entranceExams] = await Promise.all([
          admin.subjects.all({}, signal),
          admin.entranceExams.all({}, signal),
        ]);
        return { subjects, entranceExams };
      },
      [admin],
    ),
  );
  const [filter, setFilter] = useState<QuestionFilter>({});
  const list = useAdminList(admin.questions.list, { ...filter });
  const [removing, setRemoving] = useState<AdminQuestion | null>(null);
  const [notice, setNotice] = useState('');
  const create = (
    <Link className="button button-primary" to="/admin/questoes/nova">
      <Plus size={17} />
      Nova questão
    </Link>
  );
  return (
    <>
      <PageHeader
        eyebrow="BANCO DE QUESTÕES"
        title="Cada questão é um passo de alguém."
        description="Busque pelo enunciado, filtre pela origem e mantenha o gabarito em ordem."
        action={create}
      />
      <div className="admin-toolbar">
        <SearchField label="Buscar no enunciado" value={list.search} onChange={list.setSearch} />
        <FilterSelect
          label="Filtrar por disciplina"
          placeholder="Todas as disciplinas"
          value={filter.subjectId}
          onChange={(subjectId) => setFilter({ ...filter, subjectId })}
        >
          <SubjectOptions subjects={references.data?.subjects ?? []} />
        </FilterSelect>
        <FilterSelect
          label="Filtrar por vestibular"
          placeholder="Todos os vestibulares"
          value={filter.entranceExamId}
          onChange={(entranceExamId) => setFilter({ ...filter, entranceExamId })}
        >
          {references.data?.entranceExams.map((exam) => (
            <option value={exam.id} key={exam.id}>
              {exam.name} · {exam.year} · {exam.stage}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Filtrar por dificuldade"
          placeholder="Todas as dificuldades"
          value={filter.difficulty}
          onChange={(difficulty) => setFilter({ ...filter, difficulty })}
        >
          {Object.entries(difficultyLabels).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </FilterSelect>
      </div>
      {notice && (
        <div className="notice notice-success" role="status">
          {notice}
        </div>
      )}
      <AdminTable
        caption="Questões cadastradas"
        list={list}
        columns={[
          {
            header: 'Questão',
            className: 'admin-question-cell',
            cell: (question) => (
              <>
                <small className="muted">#{question.id}</small>
                <span className="admin-clamp">{question.statement}</span>
              </>
            ),
          },
          { header: 'Classificação', cell: classificationLabel },
          {
            header: 'Vestibular',
            cell: ({ entranceExam }) => `${entranceExam.name} · ${entranceExam.year}`,
          },
          {
            header: 'Dificuldade',
            cell: ({ difficulty }) =>
              (difficulty && difficultyLabels[difficulty]) || 'Não informada',
          },
        ]}
        actions={(question) => (
          <RowActions
            name={`questão ${question.id}`}
            editTo={`/admin/questoes/${question.id}`}
            onDelete={() => setRemoving(question)}
          />
        )}
        empty={{
          title: 'O banco ainda está vazio',
          description: 'Cadastre a primeira questão para que ela entre nos sorteios dos simulados.',
          action: create,
        }}
      />
      {removing && (
        <DeleteDialog
          title="Excluir esta questão?"
          name={`Questão #${removing.id}`}
          warning="Alternativas e imagens são excluídas junto. Questões que já fizeram parte de algum simulado não podem ser excluídas."
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await admin.questions.remove(removing.id);
            setRemoving(null);
            setNotice('Questão excluída.');
            list.reload();
          }}
        />
      )}
    </>
  );
}
