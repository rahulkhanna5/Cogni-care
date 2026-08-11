import { request } from './client';

export type SessionUpload = {
  gameId: string;
  startedAt: string;
  endedAt: string;
  levelStart: number;
  levelEnd: number;
  accuracy: number;
  score: number;
  avgReactionMs: number | null;
  rounds?: {
    roundNo: number;
    level: number;
    hits: number;
    misses: number;
    falseAlarms: number;
    accuracy: number;
    avgReactionMs: number | null;
  }[];
};

export type AssessmentUpload = {
  takenAt: string;
  totalScore: number;
  band: 'normal' | 'mild' | 'moderate' | 'severe';
  domains: { attention: number; stm: number; ltm: number; speed: number; adl: number };
  answers?: { itemNo: number; domain: string; value: number }[];
};

export const uploadSession = (accessToken: string, patientId: string, body: SessionUpload) =>
  request<{ id: string }>(`/patients/${patientId}/sessions`, {
    method: 'POST',
    body,
    accessToken,
  });

export const uploadAssessment = (
  accessToken: string,
  patientId: string,
  body: AssessmentUpload
) =>
  request<{ id: string }>(`/patients/${patientId}/assessments`, {
    method: 'POST',
    body,
    accessToken,
  });
