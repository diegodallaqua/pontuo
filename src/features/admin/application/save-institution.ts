import type { Address, AddressInput, Institution, InstitutionInput } from '../domain/admin';

interface Writer<T, Input> {
  create(body: Input): Promise<T>;
  update(id: number, body: Input): Promise<T>;
  remove(id: number): Promise<void>;
}
export interface InstitutionGateway {
  addresses: Writer<Address, AddressInput>;
  institutions: Writer<Institution, InstitutionInput>;
}
export interface InstitutionDraft {
  name: string;
  acronym: string;
  address: AddressInput;
}

// Cada instituição tem um endereço próprio, criado antes dela. Os POSTs não formam transação.
export async function saveInstitution(
  gateway: InstitutionGateway,
  draft: InstitutionDraft,
  current: Institution | null,
): Promise<Institution> {
  const { address, ...fields } = draft;
  if (current) {
    // PUTs idempotentes: se o segundo falhar, salvar de novo reaplica os dois.
    await gateway.addresses.update(current.address.id, address);
    return gateway.institutions.update(current.id, { ...fields, addressId: current.address.id });
  }
  const created = await gateway.addresses.create(address);
  try {
    return await gateway.institutions.create({ ...fields, addressId: created.id });
  } catch (error) {
    // Um endereço sem instituição não aparece em tela: a falha da limpeza não substitui
    // o erro que o administrador precisa corrigir.
    await gateway.addresses.remove(created.id).catch(() => undefined);
    throw error;
  }
}
export async function deleteInstitution(gateway: InstitutionGateway, institution: Institution) {
  await gateway.institutions.remove(institution.id);
  await gateway.addresses.remove(institution.address.id).catch(() => undefined);
}
