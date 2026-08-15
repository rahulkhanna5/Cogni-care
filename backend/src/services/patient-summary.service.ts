import { query, queryOne } from '../db/pool.js';

/**
 * Builds the factual picture of one patient that every AI prompt is grounded
 * in.
 *
 * The data is read here, on the server, from Postgres — never accepted from
 * the caller. Two consequences that matter:
 *
 *  1. The app cannot put numbers into the model's mouth.
 *  2. Because callers reach this only through requirePatientAccess, the model
 *     can only ever be told about a patient the requester was already allowed
 *     to read. There is no second access rule to keep in sync.
 */

/** What each game trains, so the model can say something meaningful about a
 *  weak one. Mirrors cognicare/src/games/registry.ts. */
const GAME_INFO: Record<string, { title: string; trains: string }> = {
  'blink-trail': { title: 'Blink Trail', trains: 'short-term memory, attention' },
  'market-rush': { title: 'Market Rush', trains: 'short-term memory, speed, attention' },
  'speedy-current': { title: 'Speedy Current', trains: 'processing speed, attention' },
  'sound-forest': { title: 'Sound Forest', trains: 'auditory attention, short-term memory' },
  'path-finder': { title: 'Path Finder', trains: 'planning, problem solving, daily living' },
  'emotion-meadow': { title: 'Emotion Meadow', trains: 'emotion recognition, social cognition' },
  'daily-order': { title: 'Daily Order', trains: 'sequencing, long-term memory, daily living' },
  'dual-task-flow': { title: 'Dual Task Flow', trains: 'divided attention, task switching' },
};

const DOMAIN_LABELS: Record<string, string> = {
  attention: 'Attention',
  stm: 'Short-term memory',
  ltm: 'Long-term memory',
  speed: 'Processing speed',
  adl: 'Daily living',
};

export type GameStat = {
  gameId: string;
  plays: number;
  level: number;
  meanAccuracy: number;
  recentAccuracy: number[];
  meanReactionMs: number | null;
  totalMisses: number;
  totalFalseAlarms: number;
  lastPlayed: string | null;
};

export type CheckIn = {
  takenAt: string;
  totalScore: number;
  band: string;
  attention: number;
  stm: number;
  ltm: number;
  speed: number;
  adl: number;
};

export type PatientSummary = {
  name: string;
  games: GameStat[];
  checkIns: CheckIn[];
  totalSessions: number;
};

export async function buildPatientSummary(patientId: string): Promise<PatientSummary> {
  const patient = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [
    patientId,
  ]);

  /*
   * misses and false_alarms are summed from game_rounds, not game_sessions —
   * sessions do not carry the split, and that split is the most clinically
   * interesting thing in this dataset. An attention lapse and an inhibition
   * failure look identical once they are added together.
   */
  const games = await query<{
    game_id: string;
    plays: string;
    level: number;
    mean_accuracy: string;
    mean_reaction_ms: string | null;
    total_misses: string;
    total_false_alarms: string;
    last_played: Date | null;
  }>(
    `SELECT s.game_id,
            COUNT(DISTINCT s.id)                       AS plays,
            MAX(COALESCE(s.level_end, s.level_start))  AS level,
            AVG(s.accuracy)                            AS mean_accuracy,
            AVG(s.avg_reaction_ms)                     AS mean_reaction_ms,
            COALESCE(SUM(r.misses), 0)                 AS total_misses,
            COALESCE(SUM(r.false_alarms), 0)           AS total_false_alarms,
            MAX(s.started_at)                          AS last_played
       FROM game_sessions s
       LEFT JOIN game_rounds r ON r.session_id = s.id
      WHERE s.patient_id = $1 AND s.ended_at IS NOT NULL
      GROUP BY s.game_id
      ORDER BY last_played DESC NULLS LAST`,
    [patientId]
  );

  // Per-game accuracy trend, oldest first so it reads left to right.
  const trends = await query<{ game_id: string; accuracy: string; started_at: Date }>(
    `SELECT game_id, accuracy, started_at
       FROM game_sessions
      WHERE patient_id = $1 AND ended_at IS NOT NULL AND accuracy IS NOT NULL
      ORDER BY started_at ASC`,
    [patientId]
  );

  const byGame = new Map<string, number[]>();
  for (const row of trends) {
    byGame.set(row.game_id, [...(byGame.get(row.game_id) ?? []), Number(row.accuracy)]);
  }

  const checkIns = await query<{
    taken_at: Date;
    total_score: number;
    band: string;
    attention: number;
    stm: number;
    ltm: number;
    speed: number;
    adl: number;
  }>(
    `SELECT taken_at, total_score, band, attention, stm, ltm, speed, adl
       FROM assessments WHERE patient_id = $1
      ORDER BY taken_at DESC LIMIT 5`,
    [patientId]
  );

  return {
    name: patient?.name ?? 'This patient',
    totalSessions: games.reduce((sum, g) => sum + Number(g.plays), 0),
    games: games.map((g) => ({
      gameId: g.game_id,
      plays: Number(g.plays),
      level: g.level,
      meanAccuracy: Number(g.mean_accuracy ?? 0),
      recentAccuracy: (byGame.get(g.game_id) ?? []).slice(-8),
      meanReactionMs: g.mean_reaction_ms == null ? null : Math.round(Number(g.mean_reaction_ms)),
      totalMisses: Number(g.total_misses),
      totalFalseAlarms: Number(g.total_false_alarms),
      lastPlayed: g.last_played ? g.last_played.toISOString() : null,
    })),
    checkIns: checkIns.map((c) => ({
      takenAt: c.taken_at.toISOString(),
      totalScore: c.total_score,
      band: c.band,
      attention: c.attention,
      stm: c.stm,
      ltm: c.ltm,
      speed: c.speed,
      adl: c.adl,
    })),
  };
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const day = (iso: string) => iso.slice(0, 10);

/**
 * Renders the summary as compact text for the prompt.
 *
 * Pure, so it is testable without a database — and the thing worth testing is
 * that a patient with no data produces an explicit "no data" line rather than
 * empty sections the model would be tempted to fill in.
 */
export function renderSummary(summary: PatientSummary): string {
  const lines: string[] = [`Patient: ${summary.name}`, ''];

  lines.push('GAME PRACTICE');
  if (summary.games.length === 0) {
    lines.push('No completed game sessions on record.');
  } else {
    for (const g of summary.games) {
      const info = GAME_INFO[g.gameId];
      const parts = [
        `- ${info?.title ?? g.gameId} (trains ${info?.trains ?? 'unknown'})`,
        `  sessions: ${g.plays}, current level: ${g.level}, average accuracy: ${pct(g.meanAccuracy)}`,
        `  misses: ${g.totalMisses}, false alarms: ${g.totalFalseAlarms}`,
      ];
      if (g.meanReactionMs != null) {
        parts.push(`  average reaction time: ${g.meanReactionMs}ms`);
      }
      if (g.recentAccuracy.length > 1) {
        parts.push(`  accuracy over time (oldest to newest): ${g.recentAccuracy.map(pct).join(', ')}`);
      }
      if (g.lastPlayed) parts.push(`  last played: ${day(g.lastPlayed)}`);
      lines.push(...parts);
    }
  }

  lines.push('', 'SELF-REPORTED CHECK-IN (0-100, LOWER IS BETTER)');
  if (summary.checkIns.length === 0) {
    lines.push('No check-in submitted.');
  } else {
    for (const c of summary.checkIns) {
      lines.push(
        `- ${day(c.takenAt)}: total ${c.totalScore}/100 (band: ${c.band}) — ` +
          (Object.entries(DOMAIN_LABELS) as [keyof typeof DOMAIN_LABELS, string][])
            .map(([key, label]) => `${label} ${c[key as keyof CheckIn]}/20`)
            .join(', ')
      );
    }
  }

  // Named games the patient has never opened. Stated explicitly because "not
  // practised" and "practised badly" call for opposite advice, and a list of
  // what is present does not distinguish them.
  const played = new Set(summary.games.map((g) => g.gameId));
  const untouched = Object.entries(GAME_INFO)
    .filter(([id]) => !played.has(id))
    .map(([, info]) => info.title);
  if (untouched.length) {
    lines.push('', `NEVER PLAYED: ${untouched.join(', ')}`);
  }

  return lines.join('\n');
}
