import { request } from './client';

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

export const getAssessments = (accessToken: string, id: string) =>
  request<{ assessments: ServerAssessment[] }>(`/patients/${id}/assessments?limit=12`, {
    accessToken,
  });

export const getSessions = (accessToken: string, id: string) =>
  request<{ sessions: ServerSession[] }>(`/patients/${id}/sessions?limit=100`, { accessToken });

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
  request<RemarkDraft>(`/patients/${patientId}/remarks/draft`, { method: 'POST', accessToken });

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
