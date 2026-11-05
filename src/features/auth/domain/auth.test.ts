import { describe, expect, it } from 'vitest';
import { isAdministrator } from './auth';

describe('perfil administrador', () => {
  it('normaliza a descrição como a API, sem depender de acentos ou caixa', () => {
    expect(isAdministrator({ userRole: { id: 1, description: 'Administrador' } })).toBe(true);
    expect(isAdministrator({ userRole: { id: 1, description: ' administrador ' } })).toBe(true);
    expect(isAdministrator({ userRole: { id: 2, description: 'Estudante' } })).toBe(false);
    expect(isAdministrator({ userRole: null })).toBe(false);
    expect(isAdministrator(null)).toBe(false);
  });
});
