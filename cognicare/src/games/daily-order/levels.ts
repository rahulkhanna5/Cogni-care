import { TASKS, type DailyTask } from './tasks';

export type DailyLevel = {
  /** How many steps of the routine are used. */
  stepCount: number;
  /** Plausible-but-wrong steps mixed in. */
  distractors: number;
};

/**
 * Exactly ONE thing is added at every level — one more step, or one more
 * wrong step — and nothing is ever taken away. Cards on screen therefore go
 * 3, 4, 5, 6, 7, 8, 9, 10: each level is one card harder than the last.
 *
 * It used to alternate (a step up and a distractor down), which kept the card
 * count the same and felt like the same level again — three times in ten.
 *
 * Eight levels, not ten: with seven steps and three distractors as the
 * ceiling, eight is every distinct one-card step there is. Saved progress
 * above 8 clamps to 8.
 */
export const DAILY_LEVELS: DailyLevel[] = [
  { stepCount: 3, distractors: 0 },
  { stepCount: 4, distractors: 0 },
  { stepCount: 5, distractors: 0 },
  { stepCount: 5, distractors: 1 },
  { stepCount: 6, distractors: 1 },
  { stepCount: 6, distractors: 2 },
  { stepCount: 7, distractors: 2 },
  { stepCount: 7, distractors: 3 },
];

export const DAILY_MAX_LEVEL = DAILY_LEVELS.length;
export const TASKS_PER_ROUND = 1;

export const dailyLevel = (level: number): DailyLevel =>
  DAILY_LEVELS[Math.min(Math.max(level, 1), DAILY_MAX_LEVEL) - 1];

export const describeDailyLevel = (level: number): string => {
  const s = dailyLevel(level);
  return `${s.stepCount} steps${s.distractors ? `, plus ${s.distractors} that do not belong` : ''}`;
};

export type Trial = {
  task: DailyTask;
  /** The correct sequence, trimmed to the level's step count. */
  answer: string[];
  /** Everything shown on screen, shuffled. */
  choices: string[];
};

/** Only routines long enough for this level are eligible. */
export const eligibleTasks = (stepCount: number) => TASKS.filter((t) => t.steps.length >= stepCount);

/**
 * How many of the most recent routines a new round must avoid. Four rounds
 * make a session, so six covers all of this session plus the end of the one
 * before — a routine cannot come back on the very next level, or twice in one
 * sitting.
 */
export const RECENT_WINDOW = 6;

/**
 * The routine for a round. Never one of the last few shown, so going up a
 * level never greets the player with the task they just did. If the pool is
 * too small to honour the whole window, it still refuses the last one.
 */
export function pickTask(level: number, recent: string[] = [], rnd: () => number = Math.random): DailyTask {
  const pool = eligibleTasks(dailyLevel(level).stepCount);
  const avoid = recent.slice(-RECENT_WINDOW);
  let fresh = pool.filter((t) => !avoid.includes(t.id));
  if (fresh.length === 0) fresh = pool.filter((t) => t.id !== recent[recent.length - 1]);
  if (fresh.length === 0) fresh = pool;
  return fresh[Math.floor(rnd() * fresh.length)] ?? TASKS[0]!;
}

/** Routines shown so far this run of the app, oldest first. */
let shown: string[] = [];
export const recentTasks = (): string[] => shown;
export const rememberTask = (id: string) => {
  shown = [...shown, id].slice(-RECENT_WINDOW * 2);
};
export const forgetTasks = () => {
  shown = [];
};

export function buildTrial(level: number, rnd: () => number = Math.random, recent: string[] = []): Trial {
  const spec = dailyLevel(level);
  const task = pickTask(level, recent, rnd);

  // Always the FIRST n steps, never a slice from the middle. A routine that
  // starts halfway through has no recognisable beginning to anchor on.
  const answer = task.steps.slice(0, spec.stepCount);

  const extras = task.distractors.slice(0, spec.distractors);
  const choices = [...answer, ...extras];

  // Fisher-Yates, so the shuffle is uniform rather than merely jumbled.
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [choices[i], choices[j]] = [choices[j]!, choices[i]!];
  }

  return { task, answer, choices };
}
