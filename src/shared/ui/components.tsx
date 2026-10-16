import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ArrowRight, BookOpen, LoaderCircle, RotateCcw, X, AlertCircle } from 'lucide-react';
import { Link } from 'react-router';
import { errorMessage } from '../lib/http';
import { formatAccuracy } from '../lib/date';

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label="Pontuo, início">
      <span className="brand-symbol" aria-hidden="true">
        <img src="/logo.png" alt="" />
      </span>
      <span>
        pontuo<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
export function Button({
  children,
  variant = 'primary',
  busy,
  className = '',
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  busy?: boolean;
}) {
  return (
    <button
      className={`button button-${variant} ${className}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy && <LoaderCircle size={17} className="spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function Loading({ label = 'Carregando seus dados…' }: { label?: string }) {
  return (
    <div className="state-panel" role="status">
      <LoaderCircle size={28} className="spin" />
      <p>{label}</p>
    </div>
  );
}
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="state-panel error-state" role="alert">
      <AlertCircle size={28} />
      <h2>Não foi possível carregar</h2>
      <p>{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          <RotateCcw size={16} />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div className="notice notice-error" role="alert">
      <AlertCircle size={18} />
      <div>{children}</div>
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="state-panel empty-state">
      <span className="empty-icon">
        <BookOpen size={28} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function CreateMockExamLink({ label = 'Criar simulado' }: { label?: string }) {
  return (
    <Link className="button button-primary" to="/simulados/novo">
      {label}
      <ArrowRight size={17} />
    </Link>
  );
}
export function StatCard({
  label,
  value,
  detail,
  icon,
  tone = '',
}: {
  label: string;
  value: ReactNode;
  detail: string;
  icon: ReactNode;
  tone?: string;
}) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}
export function AccuracyBar({
  value,
  label,
  detail,
}: {
  value: number;
  label: string;
  detail?: string;
}) {
  return (
    <div className="accuracy-row">
      <div className="accuracy-label">
        <span>{label}</span>
        <strong>{formatAccuracy(value)}</strong>
      </div>
      <progress
        className={value >= 70 ? 'progress-success' : value < 50 ? 'progress-warning' : ''}
        max={100}
        value={value}
        aria-label={`Acertos em ${label}`}
      />
      {detail && <small className="muted">{detail}</small>}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Fechar janela"
          onClick={onClose}
          disabled={busy}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
