import type { ServerRound } from '@/api/doctor.api';

/**
 * Per game, per level: how the rounds went, and whether the player is stuck
 * there. Misses (lapses) and false alarms (wrong taps) stay separate.
 */
export type LevelRow = {
  gameId: string;
  level: number;
  rounds: number;
  accuracy: number;
  hits: number;
  misses: number;
  falseAlarms: number;
  firstAt: string;
  lastAt: string;
  /** Rounds that went badly: under 60% right, or more mistakes than hits. */
  hardRounds: number;
  stuck: boolean;
};

/** Below this share right, a round counts as hard (the ladder's step-down line). */
export const HARD_BELOW = 0.6;
/** A level is "stuck" after this many hard rounds — one bad round is a bad day. */
export const STUCK_AFTER = 2;

export function levelRows(rounds: ServerRound[]): LevelRow[] {
  const map = new Map<string, ServerRound[]>();
  for (const r of rounds) {
    const key = `${r.game_id}#${r.level}`;
    map.set(key, [...(map.get(key) ?? []), r]);
  }
  return [...map.values()]
    .map((rs) => {
      const sorted = [...rs].sort((a, b) => a.started_at.localeCompare(b.started_at));
      const hard = rs.filter((r) => r.accuracy < HARD_BELOW || r.misses + r.false_alarms > r.hits).length;
      return {
        gameId: rs[0]!.game_id,
        level: rs[0]!.level,
        rounds: rs.length,
        accuracy: rs.reduce((a, r) => a + r.accuracy, 0) / rs.length,
        hits: rs.reduce((a, r) => a + r.hits, 0),
        misses: rs.reduce((a, r) => a + r.misses, 0),
        falseAlarms: rs.reduce((a, r) => a + r.false_alarms, 0),
        firstAt: sorted[0]!.started_at,
        lastAt: sorted[sorted.length - 1]!.started_at,
        hardRounds: hard,
        stuck: hard >= STUCK_AFTER,
      };
    })
    .sort((a, b) => a.gameId.localeCompare(b.gameId) || a.level - b.level);
}

/** One plain line for a stuck level, saying which kind of mistake it is. */
export function stuckLine(row: LevelRow, title: string): string {
  const kind =
    row.misses > row.falseAlarms * 1.5
      ? 'mostly missed items (attention)'
      : row.falseAlarms > row.misses * 1.5
        ? 'mostly wrong taps (holding back)'
        : 'missed items and wrong taps alike';
  return `${title}, level ${row.level}: ${row.hardRounds} hard rounds of ${row.rounds}, ${Math.round(
    row.accuracy * 100
  )}% right — ${kind}.`;
}
