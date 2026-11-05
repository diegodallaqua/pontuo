import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { Button, EmptyState, ErrorState, Loading } from '../../../shared/ui/components';
import type { AdminList } from '../application/use-admin-list';

export interface Column<T> {
  header: string;
  cell: (item: T) => ReactNode;
  className?: string;
}
export function AdminTable<T extends { id: number }>({
  caption,
  list,
  columns,
  actions,
  empty,
}: {
  caption: string;
  list: AdminList<T>;
  columns: Column<T>[];
  actions: (item: T) => ReactNode;
  empty: { title: string; description: string; action?: ReactNode };
}) {
  const { data, page } = list;
  return (
    <section className="panel admin-table-panel">
      {list.loading ? (
        <Loading label="Carregando registros…" />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : !data?.content.length ? (
        list.filtered ? (
          <EmptyState
            title="Nenhum registro neste recorte"
            description="Experimente outro termo de busca ou outro filtro."
          />
        ) : (
          <EmptyState {...empty} />
        )
      ) : (
        <>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th scope="col" key={column.header}>
                      {column.header}
                    </th>
                  ))}
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((item) => (
                  <tr key={item.id}>
                    {columns.map((column) => (
                      <td
                        key={column.header}
                        data-label={column.header}
                        className={column.className}
                      >
                        {column.cell(item)}
                      </td>
                    ))}
                    <td className="admin-row-actions">{actions(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination admin-pagination">
            <span>
              {data.totalElements} {data.totalElements === 1 ? 'registro' : 'registros'} · Página{' '}
              {page} de {Math.max(1, data.totalPages)}
            </span>
            <div>
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => list.setPage(page - 1)}
                aria-label="Página anterior"
              >
                <ChevronLeft size={17} />
              </Button>
              <Button
                variant="secondary"
                disabled={data.last}
                onClick={() => list.setPage(page + 1)}
                aria-label="Próxima página"
              >
                <ChevronRight size={17} />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
export function RowActions({
  name,
  onEdit,
  editTo,
  onDelete,
}: {
  name: string;
  onEdit?: () => void;
  editTo?: string;
  onDelete: () => void;
}) {
  return (
    <div className="admin-row-tools">
      {editTo ? (
        <Link className="icon-button" to={editTo} aria-label={`Editar ${name}`}>
          <Pencil size={16} />
        </Link>
      ) : (
        <button className="icon-button" aria-label={`Editar ${name}`} onClick={onEdit}>
          <Pencil size={16} />
        </button>
      )}
      <button className="icon-button" aria-label={`Excluir ${name}`} onClick={onDelete}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}
export function SearchField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="search-field">
      <Search size={17} />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        placeholder={`${label}…`}
        maxLength={100}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
