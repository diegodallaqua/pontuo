import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../shared/ui/components';
import type { Query } from '../../../shared/lib/http';
import type { Page } from '../../../shared/lib/pagination';
import { useAdminList } from '../application/use-admin-list';
import { AdminTable, RowActions, SearchField, type Column } from './admin-table';
import { DeleteDialog, type DialogProps } from './form-dialog';

type Dialog<T> = { kind: 'form'; item: T | null } | { kind: 'delete'; item: T };

// Listagem com busca, filtros, cadastro, edição e exclusão. Cada seção informa só o que
// muda: consulta, colunas, formulário e textos.
export function CrudSection<T extends { id: number }>({
  noun,
  createLabel,
  searchLabel,
  load,
  filters,
  filterControls,
  columns,
  describe,
  remove,
  deleteTitle,
  deleteWarning,
  renderForm,
}: {
  noun: string;
  createLabel: string;
  searchLabel: string;
  load: (query: Query, signal: AbortSignal) => Promise<Page<T>>;
  filters?: Query;
  filterControls?: ReactNode;
  columns: Column<T>[];
  describe: (item: T) => string;
  remove: (item: T) => Promise<void>;
  deleteTitle: string;
  deleteWarning: string;
  renderForm: (props: DialogProps<T>) => ReactNode;
}) {
  const list = useAdminList(load, filters);
  const [dialog, setDialog] = useState<Dialog<T> | null>(null);
  const [notice, setNotice] = useState('');
  function finish(message: string) {
    setDialog(null);
    setNotice(message);
    list.reload();
  }
  const close = () => setDialog(null);
  const create = (
    <Button onClick={() => setDialog({ kind: 'form', item: null })}>
      <Plus size={17} />
      {createLabel}
    </Button>
  );
  return (
    <>
      <div className="admin-toolbar">
        <SearchField label={searchLabel} value={list.search} onChange={list.setSearch} />
        {filterControls}
        {create}
      </div>
      {notice && (
        <div className="notice notice-success" role="status">
          {notice}
        </div>
      )}
      <AdminTable
        caption={noun}
        list={list}
        columns={columns}
        actions={(item) => (
          <RowActions
            name={describe(item)}
            onEdit={() => setDialog({ kind: 'form', item })}
            onDelete={() => setDialog({ kind: 'delete', item })}
          />
        )}
        empty={{
          title: 'Nada cadastrado ainda',
          description: `Cadastre o primeiro registro de ${noun.toLocaleLowerCase('pt-BR')}.`,
          action: create,
        }}
      />
      {dialog?.kind === 'form' &&
        renderForm({ item: dialog.item, onClose: close, onSaved: finish })}
      {dialog?.kind === 'delete' && (
        <DeleteDialog
          title={deleteTitle}
          name={describe(dialog.item)}
          warning={deleteWarning}
          onClose={close}
          onConfirm={async () => {
            await remove(dialog.item);
            finish('Registro excluído.');
          }}
        />
      )}
    </>
  );
}
