import { request, type Tokens } from './client';

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  isVerified: boolean;
  emailVerified: boolean;
  approvedAt: string | null;
  createdAt: string;
};

export type LoginResult = Tokens & {
  expiresIn: number;
  user: ApiUser;
  pendingApproval: boolean;
};

export const login = (email: string, password: string) =>
  request<LoginResult>('/auth/login', { method: 'POST', body: { email, password } });

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: 'PATIENT' | 'DOCTOR';
  specialty?: string;
  licenseNumber?: string;
  bio?: string;
};

export const register = (input: RegisterInput) =>
  request<{ user: ApiUser; nextStep: string; devEmailVerifyToken?: string }>('/auth/register', {
    method: 'POST',
    body: input,
  });

export const verifyEmail = (token: string) =>
  request<{ user: ApiUser; nextStep: string }>('/auth/verify-email', {
    method: 'POST',
    body: { token },
  });

export const refresh = (refreshToken: string) =>
  request<Tokens & { expiresIn: number }>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });

export const logout = (refreshToken: string) =>
  request<void>('/auth/logout', { method: 'POST', body: { refreshToken } });

export const me = (accessToken: string) =>
  request<{ user: ApiUser; pendingApproval: boolean }>('/auth/me', { accessToken });

export const forgotPassword = (email: string) =>
  request<{ message: string; devResetToken?: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });

export const resetPassword = (token: string, password: string) =>
  request<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
  });
