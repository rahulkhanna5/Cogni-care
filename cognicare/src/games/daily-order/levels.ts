import { TASKS, type DailyTask } from './tasks';

export type DailyLevel = {
  /** How many steps of the routine are used. */
  stepCount: number;
  /** Plausible-but-wrong steps mixed in. */
  distractors: number;
};

/**
 * Step count first, then distractors. Adding both at once turns a level-up
 * into a wall, the same rule the other games follow.
 */
export const DAILY_LEVELS: DailyLevel[] = [
  { stepCount: 3, distractors: 0 },
  { stepCount: 4, distractors: 0 },
  { stepCount: 4, distractors: 1 },
  { stepCount: 5, distractors: 0 },
  { stepCount: 5, distractors: 1 },
  { stepCount: 5, distractors: 2 },
  { stepCount: 6, distractors: 1 },
  { stepCount: 6, distractors: 2 },
  { stepCount: 7, distractors: 1 },
  { stepCount: 7, distractors: 2 },
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
export const eligibleTasks = (stepCount: number) =>
  TASKS.filter((t) => t.steps.length >= stepCount);

export function buildTrial(level: number, rnd: () => number = Math.random): Trial {
  const spec = dailyLevel(level);
  const pool = eligibleTasks(spec.stepCount);
  const task = pool[Math.floor(rnd() * pool.length)] ?? TASKS[0]!;

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
