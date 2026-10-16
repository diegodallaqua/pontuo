export interface User {
  id: number;
  username: string;
  email: string;
  birthDate: string;
  userRole: { id: number; description: string } | null;
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
