import { useCallback, useState } from 'react';
import { useServices } from '../../../app/services';
import { useResource } from '../../../shared/hooks/use-resource';
import type { KnowledgeArea, Subject, Topic } from '../../catalog/domain/catalog';
import { CrudSection } from './crud-section';
import { FilterSelect, ReferenceStatus, SubjectOptions } from './fields';
import { FormDialog, textField, type DialogProps } from './form-dialog';

export function KnowledgeAreasSection() {
  const { admin } = useServices();
  return (
    <CrudSection<KnowledgeArea>
      noun="Áreas de conhecimento"
      createLabel="Nova área"
      searchLabel="Buscar área"
      load={admin.knowledgeAreas.list}
      columns={[
        { header: 'Área de conhecimento', cell: (area) => <strong>{area.description}</strong> },
      ]}
      describe={(area) => area.description}
      remove={(area) => admin.knowledgeAreas.remove(area.id)}
      deleteTitle="Excluir esta área?"
      deleteWarning="A exclusão é recusada enquanto houver disciplinas nesta área."
      renderForm={(props) => <KnowledgeAreaForm {...props} />}
    />
  );
}
function KnowledgeAreaForm({ item, onClose, onSaved }: DialogProps<KnowledgeArea>) {
  const { admin } = useServices();
  return (
    <FormDialog
      title={item ? 'Editar área de conhecimento' : 'Nova área de conhecimento'}
      submitLabel={item ? 'Salvar alterações' : 'Cadastrar área'}
      onClose={onClose}
      onSubmit={async (data) => {
        await admin.knowledgeAreas.save(item?.id ?? null, {
          description: textField(data, 'description'),
        });
        onSaved(item ? 'Área atualizada.' : 'Área cadastrada.');
      }}
    >
      <label>
        Descrição
        <input name="description" defaultValue={item?.description} maxLength={120} required />
      </label>
    </FormDialog>
  );
}

export function SubjectsSection() {
  const { admin } = useServices();
  const areas = useResource(
    useCallback((signal: AbortSignal) => admin.knowledgeAreas.all({}, signal), [admin]),
  );
  const [knowledgeAreaId, setKnowledgeAreaId] = useState<number>();
  if (!areas.data) return <ReferenceStatus error={areas.error} reload={areas.reload} />;
  const options = areas.data;
  return (
    <CrudSection<Subject>
      noun="Disciplinas"
      createLabel="Nova disciplina"
      searchLabel="Buscar disciplina"
      load={admin.subjects.list}
      filters={{ knowledgeAreaId }}
      filterControls={
        <FilterSelect
          label="Filtrar por área"
          placeholder="Todas as áreas"
          value={knowledgeAreaId}
          onChange={setKnowledgeAreaId}
        >
          {options.map((area) => (
            <option value={area.id} key={area.id}>
              {area.description}
            </option>
          ))}
        </FilterSelect>
      }
      columns={[
        { header: 'Disciplina', cell: (subject) => <strong>{subject.description}</strong> },
        { header: 'Área de conhecimento', cell: (subject) => subject.knowledgeArea.description },
      ]}
      describe={(subject) => subject.description}
      remove={(subject) => admin.subjects.remove(subject.id)}
      deleteTitle="Excluir esta disciplina?"
      deleteWarning="Os assuntos da disciplina são excluídos junto. A exclusão é recusada se ela ou um de seus assuntos classificar alguma questão."
      renderForm={(props) => <SubjectForm {...props} areas={options} />}
    />
  );
}
function SubjectForm({
  item,
  areas,
  onClose,
  onSaved,
}: DialogProps<Subject> & { areas: KnowledgeArea[] }) {
  const { admin } = useServices();
  return (
    <FormDialog
      title={item ? 'Editar disciplina' : 'Nova disciplina'}
      submitLabel={item ? 'Salvar alterações' : 'Cadastrar disciplina'}
      onClose={onClose}
      onSubmit={async (data) => {
        await admin.subjects.save(item?.id ?? null, {
          description: textField(data, 'description'),
          knowledgeAreaId: Number(data.get('knowledgeAreaId')),
        });
        onSaved(item ? 'Disciplina atualizada.' : 'Disciplina cadastrada.');
      }}
    >
      <label>
        Descrição
        <input name="description" defaultValue={item?.description} maxLength={120} required />
      </label>
      <label>
        Área de conhecimento
        <select name="knowledgeAreaId" defaultValue={item?.knowledgeArea.id ?? ''} required>
          <option value="">Selecione</option>
          {areas.map((area) => (
            <option value={area.id} key={area.id}>
              {area.description}
            </option>
          ))}
        </select>
      </label>
    </FormDialog>
  );
}

export function TopicsSection() {
  const { admin } = useServices();
  const subjects = useResource(
    useCallback((signal: AbortSignal) => admin.subjects.all({}, signal), [admin]),
  );
  const [subjectId, setSubjectId] = useState<number>();
  if (!subjects.data) return <ReferenceStatus error={subjects.error} reload={subjects.reload} />;
  const options = subjects.data;
  return (
    <CrudSection<Topic>
      noun="Assuntos"
      createLabel="Novo assunto"
      searchLabel="Buscar assunto"
      load={admin.topics.list}
      filters={{ subjectId }}
      filterControls={
        <FilterSelect
          label="Filtrar por disciplina"
          placeholder="Todas as disciplinas"
          value={subjectId}
          onChange={setSubjectId}
        >
          <SubjectOptions subjects={options} />
        </FilterSelect>
      }
      columns={[
        { header: 'Assunto', cell: (topic) => <strong>{topic.description}</strong> },
        { header: 'Disciplina', cell: (topic) => topic.subject.description },
        { header: 'Área', cell: (topic) => topic.subject.knowledgeArea.description },
      ]}
      describe={(topic) => topic.description}
      remove={(topic) => admin.topics.remove(topic.id)}
      deleteTitle="Excluir este assunto?"
      deleteWarning="A exclusão é recusada se o assunto classificar alguma questão."
      renderForm={(props) => <TopicForm {...props} subjects={options} />}
    />
  );
}
function TopicForm({
  item,
  subjects,
  onClose,
  onSaved,
}: DialogProps<Topic> & { subjects: Subject[] }) {
  const { admin } = useServices();
  return (
    <FormDialog
      title={item ? 'Editar assunto' : 'Novo assunto'}
      submitLabel={item ? 'Salvar alterações' : 'Cadastrar assunto'}
      onClose={onClose}
      onSubmit={async (data) => {
        await admin.topics.save(item?.id ?? null, {
          description: textField(data, 'description'),
          subjectId: Number(data.get('subjectId')),
        });
        onSaved(item ? 'Assunto atualizado.' : 'Assunto cadastrado.');
      }}
    >
      <label>
        Descrição
        <input name="description" defaultValue={item?.description} maxLength={120} required />
      </label>
      <label>
        Disciplina
        <select name="subjectId" defaultValue={item?.subject.id ?? ''} required>
          <option value="">Selecione</option>
          <SubjectOptions subjects={subjects} />
        </select>
      </label>
    </FormDialog>
  );
}
