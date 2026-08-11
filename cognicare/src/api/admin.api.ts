import { request } from './client';

export type PendingDoctor = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  email_verified_at: string | null;
  specialty: string;
  license_number: string;
  bio: string | null;
};

export type AdminAssignment = {
  id: string;
  doctor_id: string;
  patient_id: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REVOKED';
  requested_at: string;
  approved_at: string | null;
  doctor_name: string;
  patient_name: string;
};

export const pendingDoctors = (accessToken: string) =>
  request<{ doctors: PendingDoctor[] }>('/admin/doctors/pending', { accessToken });

export const approveDoctor = (accessToken: string, id: string) =>
  request<{ user: unknown }>(`/admin/doctors/${id}/approve`, {
    method: 'POST',
    body: {},
    accessToken,
  });

/** Withdraws approval and revokes the doctor's assignments in one step. */
export const revokeDoctor = (accessToken: string, id: string) =>
  request<{ user: unknown }>(`/admin/doctors/${id}/revoke-approval`, {
    method: 'POST',
    body: {},
    accessToken,
  });

/** Rejecting an application: the account stays, but cannot be used. */
export const disableUser = (accessToken: string, id: string) =>
  request<{ user: unknown }>(`/admin/users/${id}/disable`, {
    method: 'POST',
    body: {},
    accessToken,
  });

export const listAssignments = (accessToken: string, status?: string) =>
  request<{ assignments: AdminAssignment[] }>(
    `/admin/assignments${status ? `?status=${status}` : ''}`,
    { accessToken }
  );

export const approveAssignment = (accessToken: string, id: string) =>
  request<{ assignment: unknown }>(`/assignments/${id}/approve`, {
    method: 'POST',
    body: {},
    accessToken,
  });

export const rejectAssignment = (accessToken: string, id: string, reason?: string) =>
  request<{ assignment: unknown }>(`/assignments/${id}/reject`, {
    method: 'POST',
    body: { reason },
    accessToken,
  });
