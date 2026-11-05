import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, ErrorBanner, Modal } from '../../../shared/ui/components';
import { ApiError, errorMessage } from '../../../shared/lib/http';

export interface DialogProps<T> {
  item: T | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}
// Moldura dos cadastros: trava os campos durante a gravação e mantém o diálogo aberto no erro.
// `onSubmit` grava e avisa o chamador; qualquer exceção vira mensagem no próprio diálogo.
export function FormDialog({
  title,
  submitLabel,
  danger = false,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  submitLabel: string;
  danger?: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    // Lido antes de desabilitar o fieldset: campos desabilitados ficam fora do FormData.
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await onSubmit(data);
    } catch (failure) {
      setError(failure);
      setBusy(false);
    }
  }
  return (
    <Modal title={title} onClose={onClose} busy={busy}>
      <form className="form-stack" onSubmit={submit}>
        <fieldset className="form-stack" disabled={busy}>
          {children}
        </fieldset>
        {error != null && <RequestError error={error} />}
        <div className="modal-actions">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} busy={busy}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function DeleteDialog({
  title,
  name,
  warning,
  onClose,
  onConfirm,
}: {
  title: string;
  name: string;
  warning: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <FormDialog title={title} submitLabel="Excluir" danger onClose={onClose} onSubmit={onConfirm}>
      <p>
        O registro <strong>{name}</strong> será removido da plataforma. Esta ação não pode ser
        desfeita.
      </p>
      <p className="muted">{warning}</p>
    </FormDialog>
  );
}
// Mensagens por campo só fazem sentido na validação (400); nos demais casos o resumo basta.
export function RequestError({ error }: { error: unknown }) {
  const message = errorMessage(error);
  const details =
    error instanceof ApiError && error.status === 400
      ? Object.values(error.fields).filter((detail) => detail !== message)
      : [];
  return (
    <ErrorBanner>
      {message}
      {details.length > 0 && (
        <ul className="admin-error-list">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
    </ErrorBanner>
  );
}

export function textField(data: FormData, name: string): string {
  return String(data.get(name) ?? '').trim();
}
export function optionalText(data: FormData, name: string): string | null {
  return textField(data, name) || null;
}
export function idField(data: FormData, name: string): number | null {
  return Number(data.get(name)) || null;
}
