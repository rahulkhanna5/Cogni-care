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

/* -------------------------------- directories ------------------------------- */

export type ConnectionStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REVOKED';

export type AdminPatient = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  is_active: boolean;
  sessions: number;
  last_played_at: string | null;
  /** Mean accuracy over the last 30 days, 0..1; null when nothing was played. */
  accuracy_30d: number | null;
  latest_band: 'normal' | 'mild' | 'moderate' | 'severe' | null;
  latest_score: number | null;
  latest_check_in: string | null;
  /** Open connections only (waiting or active). */
  doctors: {
    assignment_id: string;
    doctor_id: string;
    doctor_name: string;
    status: ConnectionStatus;
    doctor_accepted_at: string | null;
  }[];
};

export type AdminDoctor = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  approved_at: string | null;
  is_active: boolean;
  specialty: string | null;
  license_number: string | null;
  /** Connected and accepted on both sides. */
  patients: number;
  /** Open but still waiting on the admin or the doctor. */
  waiting: number;
};

export type AdminDoctorPatient = {
  assignment_id: string;
  status: ConnectionStatus;
  requested_at: string;
  approved_at: string | null;
  doctor_accepted_at: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  patient_id: string;
  patient_name: string;
  patient_email: string;
  sessions: number;
  last_played_at: string | null;
  accuracy_30d: number | null;
  latest_band: AdminPatient['latest_band'];
  latest_score: number | null;
  remarks: number;
};

export type AdminDoctorDetail = {
  doctor: Omit<AdminDoctor, 'patients' | 'waiting'> & { bio: string | null };
  patients: AdminDoctorPatient[];
};

export const listAllPatients = (accessToken: string) =>
  request<{ patients: AdminPatient[] }>('/admin/patients', { accessToken });

export const listAllDoctors = (accessToken: string) =>
  request<{ doctors: AdminDoctor[] }>('/admin/doctors', { accessToken });

export const getDoctor = (accessToken: string, id: string) =>
  request<AdminDoctorDetail>(`/admin/doctors/${id}`, { accessToken });

/** Every connection, any status — the admin's Connections view. */
export const allAssignments = (accessToken: string) =>
  request<{ assignments: (AdminAssignment & { doctor_accepted_at: string | null; revoked_at: string | null })[] }>(
    '/admin/assignments?limit=100',
    { accessToken }
  );

/** Where one connection stands, in words. Shared by every admin list. */
export function connectionLabel(c: { status: ConnectionStatus; doctor_accepted_at?: string | null }): {
  text: string;
  tone: 'success' | 'warning' | 'muted';
} {
  if (c.status === 'ACTIVE' && c.doctor_accepted_at) return { text: 'Connected', tone: 'success' };
  if (c.status === 'ACTIVE') return { text: 'Waiting for the doctor', tone: 'warning' };
  if (c.status === 'PENDING')
    return { text: c.doctor_accepted_at ? 'Doctor accepted · waiting for you' : 'Waiting for you', tone: 'warning' };
  if (c.status === 'REJECTED') return { text: 'Declined', tone: 'muted' };
  return { text: 'Stopped', tone: 'muted' };
}
