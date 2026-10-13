import { request } from './client';

/**
 * The patient's side of "who is my doctor": browse the approved doctors,
 * request one, see where each request stands, and stop sharing.
 *
 * Rows come back snake_case, as the assignment routes select them.
 */

export type DirectoryDoctor = {
  id: string;
  name: string;
  specialty: string | null;
  bio: string | null;
};

export type AssignmentStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REVOKED';

export type MyAssignment = {
  id: string;
  status: AssignmentStatus;
  requested_at: string;
  approved_at: string | null;
  revoked_at: string | null;
  /**
   * null = the admin approved but the doctor has not answered yet. Undefined
   * only from a server that predates the doctor's step: treated as accepted.
   */
  doctor_accepted_at?: string | null;
  doctor_id: string;
  doctor_name: string;
  /** The patient's own rating of this doctor, if they gave one. */
  my_rating?: number | null;
  my_comment?: string | null;
};

/** Approved doctors only — the server filters, so an unapproved account never appears. */
export const listDoctors = (accessToken: string) =>
  request<{ doctors: DirectoryDoctor[] }>('/doctors?limit=100', { accessToken });

export const myAssignments = (accessToken: string) =>
  request<{ assignments: MyAssignment[] }>('/assignments', { accessToken });

/** Creates a PENDING request. Nothing is shared until an administrator approves it. */
export const requestDoctor = (accessToken: string, doctorId: string) =>
  request<{ assignment: { id: string; status: AssignmentStatus } }>('/assignments', {
    method: 'POST',
    body: { doctorId },
    accessToken,
  });

/** Withdraws a pending request or stops sharing. Immediate — no admin step. */
export const stopSharing = (accessToken: string, assignmentId: string) =>
  request<{ assignment: { id: string; status: AssignmentStatus } }>(`/assignments/${assignmentId}/revoke`, {
    method: 'POST',
    body: {},
    accessToken,
  });

/** Rate a doctor you were connected to. Sending again replaces the rating. */
export const rateDoctor = (accessToken: string, assignmentId: string, rating: number, comment?: string) =>
  request<{ review: { rating: number; comment: string | null } }>(`/assignments/${assignmentId}/review`, {
    method: 'PUT',
    body: { rating, comment: comment?.trim() || undefined },
    accessToken,
  });
