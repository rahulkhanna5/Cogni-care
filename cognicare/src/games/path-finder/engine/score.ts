import type { RoundResult } from '@/games/shell/types';
import { landmark } from './level';
import type { Evaluation } from './rules';
import type { CityLevel, Weights } from './types';

/**
 * The score, out of 100, in four parts whose weights come from the level.
 * Each part is rounded before they are added, so the tiles on the result
 * screen always sum to the total shown.
 */
export type Breakdown = { distance: number; safety: number; planning: number; time: number; total: number };
export type Verdict = 'great' | 'made-it';

/** Each correction (Back one step, Start over) costs this share of planning. */
const PER_CORRECTION = 0.2;

export function score(
  ev: Evaluation,
  w: Weights,
  corrections: number,
  elapsedMs: number,
  timeLimitSec?: number
): Breakdown {
  if (!ev.reached || ev.metres === 0) return { distance: 0, safety: 0, planning: 0, time: 0, total: 0 };
  const distance = Math.round(w.distance * Math.min(1, ev.bestMetres / ev.metres));
  const safety = Math.round(w.safety * (1 - ev.busyMetres / ev.metres));
  const planning = ev.missedStops.length ? 0 : Math.round(w.planning * Math.max(0, 1 - PER_CORRECTION * corrections));
  // Speed is not the point: full marks unless the level sets a limit.
  const time = timeLimitSec
    ? Math.round(w.time * Math.min(1, (timeLimitSec * 1000) / Math.max(elapsedMs, 1)))
    : w.time;
  return { distance, safety, planning, time, total: distance + safety + planning + time };
}

export const verdict = (ev: Evaluation): Verdict =>
  ev.reached && ev.metres <= ev.bestMetres && ev.busyMetres === 0 && ev.missedStops.length === 0
    ? 'great'
    : 'made-it';

/** One calm line per thing that cost points. Never "wrong", never "failed". */
export function shortfalls(ev: Evaluation, level: CityLevel, corrections: number): string[] {
  const lines: string[] = [];
  if (ev.metres > ev.bestMetres)
    lines.push(`A shorter safe way was ${ev.metres - ev.bestMetres} m less — it is the dashed line.`);
  if (ev.busyMetres > 0) lines.push('Your route used the busy road. The quiet streets are safer.');
  for (const stop of ev.missedStops) lines.push(`You did not stop at the ${landmark(level, stop).label.toLowerCase()}.`);
  if (corrections > 0 && !ev.missedStops.length)
    lines.push(
      `You changed the route ${corrections === 1 ? 'once' : `${corrections} times`}. Planning the whole way before walking earns more points.`
    );
  return lines;
}

/**
 * One trip per GameShell turn. Busy roads walked and taps on closed roads are
 * commissions (false alarms); stops skipped are omissions (misses) — kept
 * apart, as everywhere in the app.
 */
export const toRoundResult = (ev: Evaluation, b: Breakdown, closedTaps: number, elapsedMs: number): RoundResult => ({
  hits: verdict(ev) === 'great' ? 1 : 0,
  misses: ev.missedStops.length,
  falseAlarms: ev.busyRoads.length + closedTaps,
  accuracy: b.total / 100,
  avgReactionMs: Math.round(elapsedMs),
  score: b.total,
});
