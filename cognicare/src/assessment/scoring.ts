import type { Band, Domain } from '@/db/types';
import { QUESTIONS, TOTAL_QUESTIONS } from './questions';

/** Answers keyed by question number. Partial while a check-in is in progress. */
export type Answers = Record<number, number>;

export type DomainScores = Record<Domain, number>;

export type Score = {
  /** 0..100. HIGHER MEANS MORE IMPAIRMENT — the opposite direction to every
   *  game score in this app. Label it wherever it is shown. */
  total: number;
  band: Band;
  /** 0..20 each. */
  domains: DomainScores;
};

export const MAX_TOTAL = TOTAL_QUESTIONS * 4; // 100
export const MAX_PER_DOMAIN = 20;

/** Bands exactly as defined in Questionnare.docx. */
export const BANDS: { band: Band; min: number; max: number; label: string; blurb: string }[] = [
  {
    band: 'normal',
    min: 0,
    max: 20,
    label: 'No cognitive impairment',
    blurb: 'Occasional lapses only.',
  },
  {
    band: 'mild',
    min: 21,
    max: 40,
    label: 'Mild cognitive impairment',
    blurb: 'Noticeable but manageable difficulties.',
  },
  {
    band: 'moderate',
    min: 41,
    max: 70,
    label: 'Moderate cognitive impairment',
    blurb: 'Clear functional difficulties.',
  },
  {
    band: 'severe',
    min: 71,
    max: 100,
    label: 'Severe cognitive impairment',
    blurb: 'Significant impairment affecting independence.',
  },
];

export function bandFor(total: number): Band {
  const found = BANDS.find((b) => total >= b.min && total <= b.max);
  // Clamp rather than throw: a score outside 0..100 means a bug elsewhere,
  // and a results screen that crashes is worse than one that rounds.
  return found?.band ?? (total < 0 ? 'normal' : 'severe');
}

export const bandInfo = (band: Band) => BANDS.find((b) => b.band === band)!;

export function scoreAssessment(answers: Answers): Score {
  const domains: DomainScores = { attention: 0, stm: 0, ltm: 0, speed: 0, adl: 0 };
  let total = 0;

  for (const question of QUESTIONS) {
    const value = answers[question.no];
    if (value == null) continue;
    const clamped = Math.max(0, Math.min(4, value));
    domains[question.domain] += clamped;
    total += clamped;
  }

  return { total, band: bandFor(total), domains };
}

export const isComplete = (answers: Answers) =>
  QUESTIONS.every((q) => answers[q.no] != null);

/** First unanswered question, for resuming an interrupted check-in. */
export function firstUnanswered(answers: Answers): number {
  const next = QUESTIONS.find((q) => answers[q.no] == null);
  return next ? next.no : TOTAL_QUESTIONS;
}
