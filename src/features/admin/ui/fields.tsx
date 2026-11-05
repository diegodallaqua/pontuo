import type { ReactNode } from 'react';
import { ErrorState, Loading } from '../../../shared/ui/components';
import type { Subject } from '../../catalog/domain/catalog';

// Estado de uma lista de referência que a seção precisa antes de exibir a tabela.
export function ReferenceStatus({ error, reload }: { error: unknown; reload: () => void }) {
  return error ? (
    <ErrorState error={error} onRetry={reload} />
  ) : (
    <Loading label="Preparando o catálogo…" />
  );
}
export function FilterSelect({
  label,
  placeholder,
  value,
  onChange,
  children,
}: {
  label: string;
  placeholder: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  children: ReactNode;
}) {
  return (
    <label className="admin-filter">
      <span className="sr-only">{label}</span>
      <select
        value={value ?? ''}
        onChange={(event) => onChange(Number(event.target.value) || undefined)}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
    </label>
  );
}
// Disciplinas agrupadas pela área, na ordem em que a API as devolve.
export function SubjectOptions({ subjects }: { subjects: Subject[] }) {
  const groups = new Map<string, Subject[]>();
  for (const subject of subjects) {
    const area = subject.knowledgeArea.description;
    groups.set(area, [...(groups.get(area) ?? []), subject]);
  }
  return [...groups].map(([area, items]) => (
    <optgroup label={area} key={area}>
      {items.map((subject) => (
        <option value={subject.id} key={subject.id}>
          {subject.description}
        </option>
      ))}
    </optgroup>
  ));
}
