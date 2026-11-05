export interface User {
  id: number;
  username: string;
  email: string;
  birthDate: string;
  userRole: { id: number; description: string } | null;
}
// Mesma normalização de AppUserDetails.toAuthority na API. Só decide o que exibir:
// a autorização de cada rota continua no servidor.
export function isAdministrator(user: Pick<User, 'userRole'> | null): boolean {
  const role = user?.userRole?.description
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
  return role === 'ADMINISTRADOR';
}
export interface Credentials {
  username: string;
  password: string;
}
export interface Registration extends Credentials {
  email: string;
  birthDate: string;
}
export interface AuthSession {
  accessToken: string;
  expiresAt: number;
}
export interface LoginResponse {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  user: User;
}
