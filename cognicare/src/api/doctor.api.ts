import { AI_TIMEOUT_MS, request } from './client';

/**
 * Rows come back as the database spells them (snake_case) because the
 * patient-data routes select whole rows. Kept honest here rather than
 * pretending they are camelCase.
 */

export type PatientSummary = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  assignment_id?: string;
};

export type ServerAssessment = {
  id: string;
  patient_id: string;
  taken_at: string;
  total_score: number;
  band: 'normal' | 'mild' | 'moderate' | 'severe';
  attention: number;
  stm: number;
  ltm: number;
  speed: number;
  adl: number;
};

export type ServerSession = {
  id: string;
  patient_id: string;
  game_id: string;
  started_at: string;
  ended_at: string | null;
  level_start: number;
  level_end: number | null;
  accuracy: number | null;
  score: number | null;
  avg_reaction_ms: number | null;
};

export const listPatients = (accessToken: string) =>
  request<{ patients: PatientSummary[]; total?: number }>('/patients', { accessToken });

export const getPatient = (accessToken: string, id: string) =>
  request<{ patient: PatientSummary }>(`/patients/${id}`, { accessToken });

export const getAssessments = (accessToken: string, id: string, limit = 12) =>
  request<{ assessments: ServerAssessment[] }>(`/patients/${id}/assessments?limit=${limit}`, {
    accessToken,
  });

export const getSessions = (accessToken: string, id: string, limit = 100) =>
  request<{ sessions: ServerSession[] }>(`/patients/${id}/sessions?limit=${limit}`, { accessToken });

/* --------------------------------- remarks --------------------------------- */

export type Remark = {
  id: string;
  body: string;
  plan: string | null;
  created_at: string;
  visible_to_patient: boolean;
  author_name: string;
};

export type RemarkDraft = { body: string; plan: string; raw: string; model: string };

/** Asks the AI for a draft. Saves nothing — see saveRemark. */
export const draftRemark = (accessToken: string, patientId: string) =>
  request<RemarkDraft>(`/patients/${patientId}/remarks/draft`, {
    method: 'POST',
    accessToken,
    timeoutMs: AI_TIMEOUT_MS,
  });

export const saveRemark = (
  accessToken: string,
  patientId: string,
  body: { body: string; plan?: string; aiDraft?: string; aiModel?: string }
) =>
  request<{ remark: Remark }>(`/patients/${patientId}/remarks`, {
    method: 'POST',
    body,
    accessToken,
  });

export const listRemarks = (accessToken: string, patientId: string) =>
  request<{ remarks: Remark[] }>(`/patients/${patientId}/remarks`, { accessToken });

/* ------------------------- requests waiting for me ------------------------- */

/** One row of the doctor's own assignment list. */
export type MyRequest = {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REVOKED';
  requested_at: string;
  approved_at: string | null;
  doctor_accepted_at?: string | null;
  patient_id: string;
  patient_name: string;
};

/** Still open and not yet answered by this doctor — before or after the admin. */
export const awaitingMe = (all: MyRequest[]) =>
  all.filter((r) => (r.status === 'PENDING' || r.status === 'ACTIVE') && r.doctor_accepted_at === null);

/** Accepted by this doctor, still waiting for the administrator. */
export const awaitingAdmin = (all: MyRequest[]) =>
  all.filter((r) => r.status === 'PENDING' && !!r.doctor_accepted_at);

export const myRequests = (accessToken: string) =>
  request<{ assignments: MyRequest[] }>('/assignments', { accessToken });

/** Opens the patient's results to this doctor. */
export const acceptRequest = (accessToken: string, id: string) =>
  request<{ assignment: unknown }>(`/assignments/${id}/accept`, {
    method: 'POST',
    body: {},
    accessToken,
  });

/** Closes the request. The patient sees it as not accepted; nothing is shared. */
export const declineRequest = (accessToken: string, id: string) =>
  request<{ assignment: unknown }>(`/assignments/${id}/decline`, {
    method: 'POST',
    body: {},
    accessToken,
  });

/* ---------------------------------- rounds ---------------------------------- */

/** One round of one session, with its game, level and date. */
export type ServerRound = {
  game_id: string;
  started_at: string;
  round_no: number;
  level: number;
  hits: number;
  misses: number;
  false_alarms: number;
  accuracy: number;
  avg_reaction_ms: number | null;
};

export const getRounds = (accessToken: string, id: string) =>
  request<{ rounds: ServerRound[] }>(`/patients/${id}/rounds`, { accessToken });
