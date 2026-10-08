import type { Graph } from './graph';
import { landmark } from './level';
import { step, type Target } from './route';
import { evaluate, type Evaluation } from './rules';
import { score, type Breakdown } from './score';
import type { NodeId, Trip } from './types';

/**
 * One trip, as a reducer: planning (building the route) → result (checked).
 * A reducer always sees the latest route, so two taps landing in one render
 * tick both count — a closure over React state would drop one.
 */

export type Note = { tone: 'info' | 'warning'; text: string };

export type GameState = {
  phase: 'planning' | 'result';
  route: NodeId[];
  /** Back one step / Start over presses — they cost planning points. */
  corrections: number;
  /** Taps on a closed road — commissions in the round result. */
  closedTaps: number;
  note: Note | null;
  evaluation?: Evaluation;
  breakdown?: Breakdown;
  elapsedMs?: number;
};

export type Action =
  /** null: a tap that landed on neither a crossroad nor a road. */
  | { type: 'tap'; target: Target | null }
  | { type: 'back' }
  | { type: 'reset' }
  | { type: 'check'; elapsedMs: number }
  | { type: 'clear-note' };

export const initialState = (g: Graph, trip: Trip): GameState => ({
  phase: 'planning',
  route: [landmark(g.level, trip.from).door],
  corrections: 0,
  closedTaps: 0,
  note: null,
});

const HOW_TO_WALK = 'Walk one road at a time — the glowing roads lead from where you are.';

const CLOSED: Record<'roadworks' | 'accident', string> = {
  roadworks: 'Roadworks — this road is closed. Find a way round.',
  accident: 'An accident has closed this road. Find a way round.',
};

export const reducer =
  (g: Graph, trip: Trip) =>
  (s: GameState, a: Action): GameState => {
    if (s.phase === 'result') return s;
    switch (a.type) {
      case 'tap': {
        if (!a.target) return { ...s, note: { tone: 'info', text: HOW_TO_WALK } };
        const r = step(g, trip, s.route, a.target);
        if (r.ok) return { ...s, route: r.route, note: null };
        if (r.error === 'same') return s;
        if (r.error === 'closed') {
          const kind = trip.closed?.find((c) => c.road === r.road?.id)?.kind ?? 'roadworks';
          return { ...s, closedTaps: s.closedTaps + 1, note: { tone: 'warning', text: CLOSED[kind] } };
        }
        return { ...s, note: { tone: 'info', text: HOW_TO_WALK } };
      }
      case 'back':
        return s.route.length < 2 ? s : { ...s, route: s.route.slice(0, -1), corrections: s.corrections + 1, note: null };
      case 'reset':
        return s.route.length < 2 ? s : { ...s, route: s.route.slice(0, 1), corrections: s.corrections + 1, note: null };
      case 'check': {
        if (s.route[s.route.length - 1] !== landmark(g.level, trip.to).door) return s;
        const evaluation = evaluate(g, trip, s.route);
        const breakdown = score(evaluation, g.level.weights, s.corrections, a.elapsedMs, g.level.timeLimitSec);
        return { ...s, phase: 'result', evaluation, breakdown, elapsedMs: a.elapsedMs, note: null };
      }
      case 'clear-note':
        return s.note ? { ...s, note: null } : s;
    }
  };
