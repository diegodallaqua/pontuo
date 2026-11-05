import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useServices } from '../../../app/services';
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value';
import { useResource } from '../../../shared/hooks/use-resource';
import { MAX_PAGE_SIZE } from '../../../shared/lib/pagination';
import { deleteInstitution, saveInstitution } from '../application/save-institution';
import type { AdminEntranceExam, City, Institution } from '../domain/admin';
import { CrudSection } from './crud-section';
import { FilterSelect, ReferenceStatus } from './fields';
import { FormDialog, optionalText, textField, type DialogProps } from './form-dialog';

export function InstitutionsSection() {
  const { admin } = useServices();
  return (
    <CrudSection<Institution>
      noun="Instituições"
      createLabel="Nova instituição"
      searchLabel="Buscar nome ou sigla"
      load={admin.institutions.list}
      columns={[
        { header: 'Sigla', cell: (institution) => <strong>{institution.acronym}</strong> },
        { header: 'Instituição', cell: (institution) => institution.name },
        { header: 'Cidade', cell: (institution) => cityLabel(institution.address.city) },
      ]}
      describe={(institution) => institution.acronym}
      remove={(institution) => deleteInstitution(admin, institution)}
      deleteTitle="Excluir esta instituição?"
      deleteWarning="O endereço é removido junto. A exclusão é recusada enquanto houver vestibulares desta instituição."
      renderForm={(props) => <InstitutionForm {...props} />}
    />
  );
}
function cityLabel(city: City) {
  return city.state ? `${city.name} · ${city.state.name}` : city.name;
}
function InstitutionForm({ item, onClose, onSaved }: DialogProps<Institution>) {
  const { admin } = useServices();
  const address = item?.address;
  return (
    <FormDialog
      title={item ? 'Editar instituição' : 'Nova instituição'}
      submitLabel={item ? 'Salvar alterações' : 'Cadastrar instituição'}
      onClose={onClose}
      onSubmit={async (data) => {
        await saveInstitution(
          admin,
          {
            name: textField(data, 'name'),
            acronym: textField(data, 'acronym'),
            address: {
              street: textField(data, 'street'),
              number: Number(data.get('number')),
              neighborhood: textField(data, 'neighborhood'),
              complement: optionalText(data, 'complement'),
              cityId: Number(data.get('cityId')),
            },
          },
          item,
        );
        onSaved(item ? 'Instituição atualizada.' : 'Instituição cadastrada.');
      }}
    >
      <label>
        Nome
        <input name="name" defaultValue={item?.name} maxLength={160} required />
      </label>
      <label>
        Sigla
        <input name="acronym" defaultValue={item?.acronym} maxLength={20} required />
      </label>
      <fieldset className="form-stack admin-fieldset">
        <legend className="field-label">Endereço</legend>
        <div className="form-columns">
          <label>
            Logradouro
            <input name="street" defaultValue={address?.street} maxLength={180} required />
          </label>
          <label>
            Número
            <input
              name="number"
              type="number"
              min={1}
              max={2_147_483_647}
              defaultValue={address?.number}
              required
            />
          </label>
        </div>
        <div className="form-columns">
          <label>
            Bairro
            <input
              name="neighborhood"
              defaultValue={address?.neighborhood}
              maxLength={120}
              required
            />
          </label>
          <label>
            Complemento
            <input name="complement" defaultValue={address?.complement ?? ''} maxLength={120} />
          </label>
        </div>
        <CityField initial={address?.city ?? null} />
      </fieldset>
    </FormDialog>
  );
}
// São mais de 5 mil cidades: a lista vem da busca no estado escolhido, não de um select completo.
function CityField({ initial }: { initial: City | null }) {
  const { admin } = useServices();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [stateId, setStateId] = useState(initial?.state?.id ?? 0);
  const [name, setName] = useState(initial?.name ?? '');
  const term = useDebouncedValue(name.trim(), 250);
  const states = useResource(
    useCallback((signal: AbortSignal) => admin.states.all({}, signal), [admin]),
  );
  const cities = useResource(
    useCallback(
      (signal: AbortSignal) =>
        stateId
          ? admin.cities.list({ stateId, search: term, limit: MAX_PAGE_SIZE }, signal)
          : Promise.resolve(null),
      [admin, stateId, term],
    ),
  );
  const city = cities.data?.content.find(
    (item) => item.name.localeCompare(name.trim(), 'pt-BR', { sensitivity: 'base' }) === 0,
  );
  useEffect(() => {
    input.current?.setCustomValidity(
      city || !name.trim() ? '' : 'Escolha uma cidade da lista do estado selecionado.',
    );
  }, [city, name]);
  return (
    <div className="form-columns">
      <label>
        Estado
        <select
          value={stateId || ''}
          required
          disabled={!states.data}
          onChange={(event) => {
            setStateId(Number(event.target.value));
            setName('');
          }}
        >
          <option value="">{states.data ? 'Selecione' : 'Carregando estados…'}</option>
          {states.data?.map((state) => (
            <option value={state.id} key={state.id}>
              {state.name}
            </option>
          ))}
        </select>
        {states.error != null && (
          <small>
            Não foi possível carregar os estados.{' '}
            <button type="button" className="text-link" onClick={states.reload}>
              Tentar novamente
            </button>
          </small>
        )}
      </label>
      <label>
        Cidade
        <input
          ref={input}
          list={listId}
          value={name}
          required
          disabled={!stateId}
          autoComplete="off"
          placeholder={stateId ? 'Digite para buscar' : 'Escolha o estado'}
          onChange={(event) => setName(event.target.value)}
        />
        <datalist id={listId}>
          {cities.data?.content.map((item) => (
            <option value={item.name} key={item.id} />
          ))}
        </datalist>
      </label>
      <input type="hidden" name="cityId" value={city?.id ?? ''} />
    </div>
  );
}

export function EntranceExamsSection() {
  const { admin } = useServices();
  const institutions = useResource(
    useCallback((signal: AbortSignal) => admin.institutions.all({}, signal), [admin]),
  );
  const [institutionId, setInstitutionId] = useState<number>();
  if (!institutions.data)
    return <ReferenceStatus error={institutions.error} reload={institutions.reload} />;
  const options = institutions.data;
  return (
    <CrudSection<AdminEntranceExam>
      noun="Vestibulares"
      createLabel="Novo vestibular"
      searchLabel="Buscar nome ou etapa"
      load={admin.entranceExams.list}
      filters={{ institutionId }}
      filterControls={
        <FilterSelect
          label="Filtrar por instituição"
          placeholder="Todas as instituições"
          value={institutionId}
          onChange={setInstitutionId}
        >
          {options.map((institution) => (
            <option value={institution.id} key={institution.id}>
              {institution.acronym}
            </option>
          ))}
        </FilterSelect>
      }
      columns={[
        { header: 'Vestibular', cell: (exam) => <strong>{exam.name}</strong> },
        { header: 'Ano', cell: (exam) => exam.year },
        { header: 'Etapa', cell: (exam) => exam.stage },
        { header: 'Instituição', cell: (exam) => exam.institution.acronym },
      ]}
      describe={(exam) => `${exam.name} ${exam.year} · ${exam.stage}`}
      remove={(exam) => admin.entranceExams.remove(exam.id)}
      deleteTitle="Excluir este vestibular?"
      deleteWarning="A exclusão é recusada enquanto houver questões deste vestibular."
      renderForm={(props) => <EntranceExamForm {...props} institutions={options} />}
    />
  );
}
function EntranceExamForm({
  item,
  institutions,
  onClose,
  onSaved,
}: DialogProps<AdminEntranceExam> & { institutions: Institution[] }) {
  const { admin } = useServices();
  return (
    <FormDialog
      title={item ? 'Editar vestibular' : 'Novo vestibular'}
      submitLabel={item ? 'Salvar alterações' : 'Cadastrar vestibular'}
      onClose={onClose}
      onSubmit={async (data) => {
        await admin.entranceExams.save(item?.id ?? null, {
          name: textField(data, 'name'),
          year: Number(data.get('year')),
          stage: textField(data, 'stage'),
          institutionId: Number(data.get('institutionId')),
        });
        onSaved(item ? 'Vestibular atualizado.' : 'Vestibular cadastrado.');
      }}
    >
      <label>
        Nome
        <input
          name="name"
          defaultValue={item?.name}
          maxLength={160}
          required
          placeholder="Ex.: Vestibular Unicamp"
        />
      </label>
      <div className="form-columns">
        <label>
          Ano
          <input
            name="year"
            type="number"
            min={1900}
            max={2100}
            defaultValue={item?.year ?? new Date().getFullYear()}
            required
          />
        </label>
        <label>
          Etapa
          <input
            name="stage"
            defaultValue={item?.stage}
            maxLength={40}
            required
            placeholder="Ex.: 1ª Fase"
          />
        </label>
      </div>
      <label>
        Instituição
        <select name="institutionId" defaultValue={item?.institution.id ?? ''} required>
          <option value="">Selecione</option>
          {institutions.map((institution) => (
            <option value={institution.id} key={institution.id}>
              {institution.acronym} · {institution.name}
            </option>
          ))}
        </select>
      </label>
    </FormDialog>
  );
}
