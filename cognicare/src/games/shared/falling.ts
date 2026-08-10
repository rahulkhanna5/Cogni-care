/**
 * Pure engine shared by Market Rush and Speedy Current.
 *
 * No React, no timers of its own — the caller advances it. That keeps the
 * scoring rules testable in milliseconds instead of through a rendered tree,
 * which is where the Blink Trail bugs hid.
 */

export type FallerKind = 'target' | 'distractor' | 'forbidden';

export type FallerSpec = {
  id: number;
  kind: FallerKind;
  label: string;
  emoji: string;
  /** 0..1 across the board width */
  x: number;
  spawnAtMs: number;
  /** how long it takes to cross the board */
  travelMs: number;
  /** 'down' enters at the top, 'up' enters at the bottom */
  direction: 'down' | 'up';
};

export type FallerStatus = 'pending' | 'active' | 'tapped' | 'expired';

export type Faller = FallerSpec & {
  status: FallerStatus;
  /** 0..1 along its direction of travel; only meaningful while active */
  progress: number;
};

export type EngineState = {
  timeMs: number;
  durationMs: number;
  items: Faller[];
  hits: number;
  misses: number;
  falseAlarms: number;
  score: number;
  latencies: number[];
};

export const SCORE_HIT = 10;
export const SCORE_PENALTY = 5;

export function createEngine(durationMs: number, specs: FallerSpec[]): EngineState {
  return {
    timeMs: 0,
    durationMs,
    items: specs.map((s) => ({ ...s, status: 'pending', progress: 0 })),
    hits: 0,
    misses: 0,
    falseAlarms: 0,
    score: 0,
    latencies: [],
  };
}

/** Advance to an absolute time. Safe to call at any cadence. */
export function advance(state: EngineState, toMs: number): EngineState {
  state.timeMs = toMs;

  for (const item of state.items) {
    if (item.status === 'tapped' || item.status === 'expired') continue;

    const elapsed = toMs - item.spawnAtMs;
    if (elapsed < 0) {
      item.status = 'pending';
      continue;
    }

    const progress = elapsed / item.travelMs;
    item.progress = progress;

    if (progress >= 1) {
      item.status = 'expired';
      // Only an un-tapped target counts against the player. Letting a
      // distractor leave the screen is the correct response, not a failure.
      if (item.kind === 'target') state.misses += 1;
    } else {
      item.status = 'active';
    }
  }

  return state;
}

export function tap(state: EngineState, id: number, atMs: number): EngineState {
  const item = state.items.find((i) => i.id === id);
  if (!item || item.status !== 'active') return state;

  item.status = 'tapped';

  if (item.kind === 'target') {
    state.hits += 1;
    state.score += SCORE_HIT;
    state.latencies.push(atMs - item.spawnAtMs);
  } else {
    // Distractors and forbidden items are both errors of commission.
    state.falseAlarms += 1;
    state.score = Math.max(0, state.score - SCORE_PENALTY);
  }

  return state;
}

export const totalTargets = (state: EngineState) =>
  state.items.filter((i) => i.kind === 'target').length;

export function isComplete(state: EngineState): boolean {
  if (state.timeMs >= state.durationMs) return true;
  return state.items.every((i) => i.status === 'tapped' || i.status === 'expired');
}

export function summarise(state: EngineState) {
  const targets = totalTargets(state);
  const avg = state.latencies.length
    ? Math.round(state.latencies.reduce((a, b) => a + b, 0) / state.latencies.length)
    : null;

  return {
    hits: state.hits,
    misses: state.misses,
    falseAlarms: state.falseAlarms,
    // Accuracy is hits over targets only. Penalising it by false alarms too
    // would double-count them — they already cost score, and they are
    // recorded separately for analysis.
    accuracy: targets === 0 ? 0 : state.hits / targets,
    avgReactionMs: avg,
    score: state.score,
  };
}

/* ------------------------------- scheduling ------------------------------- */

export type ScheduleOptions = {
  durationMs: number;
  targetCount: number;
  distractorCount: number;
  forbiddenCount?: number;
  travelMs: number;
  direction?: 'down' | 'up';
  distractorDirection?: 'down' | 'up';
  targets: { label: string; emoji: string }[];
  distractors: { label: string; emoji: string }[];
  forbidden?: { label: string; emoji: string }[];
  random?: () => number;
};

/**
 * Lays out a whole round up front. Deterministic given a seeded `random`,
 * which is what makes the engine tests reproducible.
 */
export function schedule(opts: ScheduleOptions): FallerSpec[] {
  const rnd = opts.random ?? Math.random;
  const specs: FallerSpec[] = [];
  let id = 0;

  // Stop spawning early enough that the last item can still cross the board.
  const window = Math.max(1, opts.durationMs - opts.travelMs);

  const push = (
    kind: FallerKind,
    pool: { label: string; emoji: string }[],
    count: number,
    direction: 'down' | 'up',
    /**
     * Targets walk the pool in order instead of being drawn at random.
     * Drawing randomly meant a 3-item shopping list could spawn the same
     * item twice and never spawn the third — the player is then asked to
     * find something that never appears. Distractors stay random.
     */
    cycle = false
  ) => {
    for (let i = 0; i < count; i++) {
      const pick = cycle ? pool[i % pool.length] : pool[Math.floor(rnd() * pool.length) % pool.length];
      specs.push({
        id: id++,
        kind,
        label: pick.label,
        emoji: pick.emoji,
        // Keep clear of the edges so nothing sits under a rounded corner.
        x: 0.1 + rnd() * 0.8,
        spawnAtMs: Math.floor(rnd() * window),
        travelMs: opts.travelMs,
        direction,
      });
    }
  };

  push('target', opts.targets, opts.targetCount, opts.direction ?? 'down', true);
  push(
    'distractor',
    opts.distractors,
    opts.distractorCount,
    opts.distractorDirection ?? opts.direction ?? 'down'
  );
  if (opts.forbiddenCount && opts.forbidden?.length) {
    push('forbidden', opts.forbidden, opts.forbiddenCount, opts.direction ?? 'down');
  }

  return specs.sort((a, b) => a.spawnAtMs - b.spawnAtMs);
}
