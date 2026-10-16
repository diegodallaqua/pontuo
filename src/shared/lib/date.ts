const utcOffset = import.meta.env.VITE_API_UTC_OFFSET || '-03:00';
if (!/^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(utcOffset))
  throw new Error('VITE_API_UTC_OFFSET inválido. Use um offset como -03:00.');

export function parseApiDate(value: string, offset = utcOffset): Date {
  return new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}${offset}`);
}
export function formatDate(value: string | null, short = false): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    ...(short ? {} : { year: 'numeric' }),
  }).format(parseApiDate(value));
}
export function formatAccuracy(value: number | null | undefined): string {
  return value == null
    ? '—'
    : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`;
}
export function formatTimer(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, '0')}:${(safe % 60).toString().padStart(2, '0')}`;
}
export function localDateInput(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
