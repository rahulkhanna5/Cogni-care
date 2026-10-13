import type { ServerAssessment, ServerSession } from '@/api/doctor.api';
import type { Band } from '@/db/types';
import { getGame } from '@/games/registry';

/**
 * What a doctor wants to know first: is this person playing, are they getting
 * better or worse, and is anything worth a call. Pure functions over the rows
 * the server already returns, so they are tested without a screen.
 *
 * Games and the check-in are summarised side by side and never merged into one
 * number — they measure different things, and a combined figure would imply a
 * link the data cannot support.
 */

/** No play for this long is worth a look. */
export const LAPSE_DAYS = 7;
/** Check-in points (0-100, higher = worse) that count as a real change. */
export const CHECKIN_WORSE_POINTS = 5;
/** Accuracy drop, in fractions of 1, that counts as a real fall. */
export const ACCURACY_DROP = 0.1;

const DAY_MS = 86_400_000;
const BAND_ORDER: Band[] = ['normal', 'mild', 'moderate', 'severe'];

export type AttentionReason =
  | { kind: 'never-played' }
  | { kind: 'lapsed'; days: number }
  | { kind: 'checkin-worse'; by: number }
  | { kind: 'band-worse'; to: Band }
  | { kind: 'accuracy-drop'; gameId: string; points: number };

export type GameTrend = {
  gameId: string;
  plays: number;
  level: number;
  meanAccuracy: number;
  /** Oldest → newest, last 10. */
  trend: number[];
  /** The same last 10 sessions with their date and level, for the bar chart. */
  points: { at: string; accuracy: number; level: number }[];
  firstAt: string;
  lastAt: string;
  meanReactionMs: number | null;
  /** Mean of the last 3 sessions. */
  recent: number;
  /** Mean of the 5 before those; null until there are enough to compare. */
  earlier: number | null;
};

export type PatientInsight = {
  sessionsTotal: number;
  sessionsLast7: number;
  activeDaysLast7: number;
  lastPlayedAt: string | null;
  daysSincePlay: number | null;
  latest: ServerAssessment | null;
  previous: ServerAssessment | null;
  /** Latest total minus the one before. HIGHER IS WORSE here, unlike games. */
  checkInChange: number | null;
  trends: GameTrend[];
  attention: AttentionReason[];
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const daysAgo = (now: Date, iso: string) => Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS);

export function gameTrends(sessions: ServerSession[]): GameTrend[] {
  const byGame = new Map<string, ServerSession[]>();
  // Oldest first so a trend reads left to right.
  for (const s of [...sessions].sort((a, b) => a.started_at.localeCompare(b.started_at))) {
    byGame.set(s.game_id, [...(byGame.get(s.game_id) ?? []), s]);
  }

  return [...byGame.entries()]
    .map(([gameId, rows]) => {
      const acc = rows.map((r) => r.accuracy ?? 0);
      const reactions = rows.map((r) => r.avg_reaction_ms).filter((n): n is number => n != null);
      const last = rows[rows.length - 1]!;
      const recent = acc.slice(-3);
      const before = acc.slice(0, -3).slice(-5);
      return {
        gameId,
        plays: rows.length,
        level: last.level_end ?? last.level_start ?? 1,
        meanAccuracy: mean(acc),
        trend: acc.slice(-10),
        points: rows.slice(-10).map((r) => ({ at: r.started_at, accuracy: r.accuracy ?? 0, level: r.level_start })),
        firstAt: rows[0]!.started_at,
        lastAt: last.started_at,
        meanReactionMs: reactions.length ? Math.round(mean(reactions)) : null,
        recent: mean(recent),
        earlier: before.length >= 2 ? mean(before) : null,
      };
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/** `assessments` newest first, as the server returns them. */
export function summarise(
  sessions: ServerSession[],
  assessments: ServerAssessment[],
  now: Date = new Date()
): PatientInsight {
  const trends = gameTrends(sessions);
  const last7 = sessions.filter((s) => daysAgo(now, s.started_at) < 7);
  const activeDays = new Set(last7.map((s) => s.started_at.slice(0, 10)));
  const lastPlayedAt = trends.length ? trends[0]!.lastAt : null;
  const daysSincePlay = lastPlayedAt ? Math.max(0, daysAgo(now, lastPlayedAt)) : null;

  const latest = assessments[0] ?? null;
  const previous = assessments[1] ?? null;
  const checkInChange = latest && previous ? latest.total_score - previous.total_score : null;

  const attention: AttentionReason[] = [];
  if (sessions.length === 0) attention.push({ kind: 'never-played' });
  else if (daysSincePlay !== null && daysSincePlay >= LAPSE_DAYS)
    attention.push({ kind: 'lapsed', days: daysSincePlay });

  if (checkInChange !== null && checkInChange >= CHECKIN_WORSE_POINTS)
    attention.push({ kind: 'checkin-worse', by: checkInChange });
  if (latest && previous && BAND_ORDER.indexOf(latest.band) > BAND_ORDER.indexOf(previous.band))
    attention.push({ kind: 'band-worse', to: latest.band });

  // The one game that fell furthest, not a list of every wobble.
  const worst = trends
    .filter((t) => t.earlier !== null && t.earlier - t.recent >= ACCURACY_DROP)
    .sort((a, b) => b.earlier! - b.recent - (a.earlier! - a.recent))[0];
  if (worst)
    attention.push({
      kind: 'accuracy-drop',
      gameId: worst.gameId,
      points: Math.round((worst.earlier! - worst.recent) * 100),
    });

  return {
    sessionsTotal: sessions.length,
    sessionsLast7: last7.length,
    activeDaysLast7: activeDays.size,
    lastPlayedAt,
    daysSincePlay,
    latest,
    previous,
    checkInChange,
    trends,
    attention,
  };
}

/* --------------------------------- wording -------------------------------- */

export const agoText = (days: number | null) =>
  days === null ? 'never' : days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;

const gameTitle = (id: string) => getGame(id)?.title ?? id;

export function describeReason(r: AttentionReason): string {
  switch (r.kind) {
    case 'never-played':
      return 'No results shared yet';
    case 'lapsed':
      return `Has not played in ${r.days} days`;
    case 'checkin-worse':
      return `Check-in ${r.by} points worse`;
    case 'band-worse':
      return `Check-in moved to ${r.to}`;
    case 'accuracy-drop':
      return `${gameTitle(r.gameId)} accuracy down ${r.points} points`;
  }
}

/** One or two plain sentences: the answer to "how are they doing?". */
export function statusLine(i: PatientInsight): string {
  if (i.sessionsTotal === 0 && !i.latest) return 'No results shared yet.';
  const parts: string[] = [];
  if (i.sessionsTotal > 0) {
    parts.push(
      i.activeDaysLast7 > 0
        ? `Played on ${i.activeDaysLast7} of the last 7 days.`
        : `Last played ${agoText(i.daysSincePlay)}.`
    );
  }
  const drop = i.attention.find((r) => r.kind === 'accuracy-drop');
  if (drop && drop.kind === 'accuracy-drop')
    parts.push(`${gameTitle(drop.gameId)} accuracy is down ${drop.points} points.`);
  if (i.latest) {
    const change =
      i.checkInChange === null
        ? ''
        : i.checkInChange === 0
          ? ', unchanged since the last one'
          : `, ${Math.abs(i.checkInChange)} points ${i.checkInChange > 0 ? 'worse' : 'better'} than the last one`;
    parts.push(`Latest check-in: ${i.latest.band}${change}.`);
  }
  return parts.join(' ');
}

/** For the list: patients with something to look at first, then by name. */
export function needsLookFirst<T extends { name: string; insight?: PatientInsight }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => (b.insight?.attention.length ?? 0) - (a.insight?.attention.length ?? 0) || a.name.localeCompare(b.name)
  );
}

/** Which colour intent a band reads in. Lower is better, so normal is the good end. */
export const bandTone = (band: Band): 'success' | 'warning' | 'danger' =>
  band === 'normal' ? 'success' : band === 'severe' ? 'danger' : 'warning';
