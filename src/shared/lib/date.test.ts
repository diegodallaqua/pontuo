import { describe, expect, it } from 'vitest';
import { formatTimer, parseApiDate } from './date';

describe('datas da API e prazo do simulado', () => {
  it('interpreta LocalDateTime no offset configurado, independente do navegador', () => {
    expect(parseApiDate('2026-10-15T10:30:00', '-03:00').toISOString()).toBe(
      '2026-10-15T13:30:00.000Z',
    );
  });
  it('preserva timestamps que já carregam offset ou UTC', () => {
    expect(parseApiDate('2026-10-15T10:30:00Z').toISOString()).toBe('2026-10-15T10:30:00.000Z');
    expect(parseApiDate('2026-10-15T10:30:00-04:00').toISOString()).toBe(
      '2026-10-15T14:30:00.000Z',
    );
  });
  it('usa prazo absoluto para recuperar tempo após uma aba suspensa', () => {
    const started = parseApiDate('2026-10-15T10:00:00', '-03:00').getTime();
    const deadline = started + 30 * 60_000;
    expect(
      formatTimer((deadline - parseApiDate('2026-10-15T10:21:30', '-03:00').getTime()) / 1000),
    ).toBe('08:30');
    expect(formatTimer(-1)).toBe('00:00');
  });
});
