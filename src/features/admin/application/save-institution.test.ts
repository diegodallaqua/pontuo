import { describe, expect, it, vi } from 'vitest';
import { deleteInstitution, saveInstitution, type InstitutionGateway } from './save-institution';
import type { Institution } from '../domain/admin';

const address = {
  street: 'Rua dos Andradas',
  neighborhood: 'Santa Ifigênia',
  number: 140,
  complement: null,
  cityId: 5285,
};
const draft = { name: 'Fundação Universitária para o Vestibular', acronym: 'FUVEST', address };
const existing = {
  id: 2,
  name: 'Fuvest',
  acronym: 'FUVEST',
  address: { id: 20, ...address, city: { id: 5285, name: 'São Paulo', state: null } },
} as Institution;

function gateway(institutionFails = false) {
  const fail = async () => {
    throw new Error('sigla já cadastrada');
  };
  return {
    addresses: {
      create: vi.fn(async () => ({ ...existing.address, id: 30 })),
      update: vi.fn(async () => existing.address),
      remove: vi.fn(async () => undefined),
    },
    institutions: {
      create: vi.fn(institutionFails ? fail : async () => existing),
      update: vi.fn(institutionFails ? fail : async () => existing),
      remove: vi.fn(async () => undefined),
    },
  } satisfies InstitutionGateway;
}

describe('cadastro de instituições', () => {
  it('cria o endereço antes e vincula a instituição a ele', async () => {
    const fake = gateway();
    await saveInstitution(fake, draft, null);
    expect(fake.addresses.create).toHaveBeenCalledWith(address);
    expect(fake.institutions.create).toHaveBeenCalledWith({
      name: draft.name,
      acronym: 'FUVEST',
      addressId: 30,
    });
  });
  it('remove o endereço criado se a instituição for recusada', async () => {
    const fake = gateway(true);
    await expect(saveInstitution(fake, draft, null)).rejects.toThrow('sigla já cadastrada');
    expect(fake.addresses.remove).toHaveBeenCalledWith(30);
  });
  it('atualiza o endereço existente sem criar outro', async () => {
    const fake = gateway();
    await saveInstitution(fake, draft, existing);
    expect(fake.addresses.create).not.toHaveBeenCalled();
    expect(fake.addresses.update).toHaveBeenCalledWith(20, address);
    expect(fake.institutions.update).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ addressId: 20 }),
    );
  });
  it('exclui o endereço depois da instituição', async () => {
    const fake = gateway();
    await deleteInstitution(fake, existing);
    expect(fake.institutions.remove).toHaveBeenCalledWith(2);
    expect(fake.addresses.remove).toHaveBeenCalledWith(20);
  });
});
