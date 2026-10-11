import { buildTrial, DAILY_LEVELS, dailyLevel, eligibleTasks, pickTask, RECENT_WINDOW } from './levels';
import { TASKS } from './tasks';

describe('daily order trials', () => {
  it('uses the requested number of steps plus distractors', () => {
    for (let level = 1; level <= DAILY_LEVELS.length; level++) {
      const spec = dailyLevel(level);
      const trial = buildTrial(level);
      expect(trial.answer).toHaveLength(spec.stepCount);
      expect(trial.choices).toHaveLength(spec.stepCount + spec.distractors);
    }
  });

  it('keeps the answer in the routine’s real order', () => {
    for (let i = 0; i < 200; i++) {
      const trial = buildTrial(6);
      const source = TASKS.find((t) => t.id === trial.task.id)!;
      // The answer must be a prefix of the real routine, not a reshuffle.
      expect(source.steps.slice(0, trial.answer.length)).toEqual(trial.answer);
    }
  });

  it('only offers routines long enough for the level', () => {
    for (let level = 1; level <= DAILY_LEVELS.length; level++) {
      const spec = dailyLevel(level);
      for (const task of eligibleTasks(spec.stepCount)) {
        expect(task.steps.length).toBeGreaterThanOrEqual(spec.stepCount);
      }
      // A level with no usable routine would render an empty screen.
      expect(eligibleTasks(spec.stepCount).length).toBeGreaterThan(0);
    }
  });

  it('includes every answer step among the choices', () => {
    for (let i = 0; i < 100; i++) {
      const trial = buildTrial(8);
      for (const step of trial.answer) expect(trial.choices).toContain(step);
    }
  });

  it('never repeats a choice', () => {
    for (let i = 0; i < 100; i++) {
      const trial = buildTrial(10);
      expect(new Set(trial.choices).size).toBe(trial.choices.length);
    }
  });

  it('actually shuffles rather than showing the answer in order', () => {
    // With 7 steps the odds of a correct-order shuffle are 1/5040, so across
    // 200 trials an always-sorted result would mean the shuffle is broken.
    let sameAsAnswer = 0;
    for (let i = 0; i < 200; i++) {
      const trial = buildTrial(10);
      if (trial.choices.join('|') === trial.answer.join('|')) sameAsAnswer++;
    }
    expect(sameAsAnswer).toBeLessThan(10);
  });

  it('adds exactly one card at every level — never the same load twice', () => {
    for (let i = 1; i < DAILY_LEVELS.length; i++) {
      const load = (l: { stepCount: number; distractors: number }) => l.stepCount + l.distractors;
      expect(load(DAILY_LEVELS[i]!)).toBe(load(DAILY_LEVELS[i - 1]!) + 1);
      // And nothing is ever taken away to make room.
      expect(DAILY_LEVELS[i]!.stepCount).toBeGreaterThanOrEqual(DAILY_LEVELS[i - 1]!.stepCount);
      expect(DAILY_LEVELS[i]!.distractors).toBeGreaterThanOrEqual(DAILY_LEVELS[i - 1]!.distractors);
    }
  });
});

describe('a routine does not come round again', () => {
  /** Plays `sessions` sessions of 4 rounds at each given level, as the app does. */
  function play(levels: number[], seed = 1) {
    let n = seed;
    const rnd = () => {
      n = (n * 9301 + 49297) % 233280;
      return n / 233280;
    };
    const shown: { level: number; id: string }[] = [];
    for (const level of levels) {
      for (let round = 0; round < 4; round++) {
        const recent = shown.map((s) => s.id);
        shown.push({ level, id: buildTrial(level, rnd, recent).task.id });
      }
    }
    return shown;
  }

  it('shows four different routines in one session, at every level', () => {
    for (let level = 1; level <= DAILY_LEVELS.length; level++) {
      for (let seed = 1; seed <= 25; seed++) {
        const ids = play([level], seed).map((s) => s.id);
        expect(new Set(ids).size).toBe(4);
      }
    }
  });

  it('never opens a new level with the routine that just ended the last one', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const shown = play(
        DAILY_LEVELS.map((_, i) => i + 1),
        seed
      );
      for (let i = 1; i < shown.length; i++) expect(shown[i]!.id).not.toBe(shown[i - 1]!.id);
    }
  });

  it('keeps clear of the last six, so a routine waits out more than a session', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const shown = play([1, 2, 3, 4, 5, 6, 7, 8], seed).map((s) => s.id);
      for (let i = 0; i < shown.length; i++) {
        const window = shown.slice(Math.max(0, i - RECENT_WINDOW), i);
        expect(window).not.toContain(shown[i]);
      }
    }
  });

  it('has several routines to choose from at EVERY level — the top ones used to have one', () => {
    for (let level = 1; level <= DAILY_LEVELS.length; level++) {
      expect(eligibleTasks(dailyLevel(level).stepCount).length).toBeGreaterThanOrEqual(RECENT_WINDOW + 2);
    }
  });

  it('still returns something when asked to avoid everything', () => {
    const everyone = eligibleTasks(3).map((t) => t.id);
    expect(pickTask(1, everyone)).toBeDefined();
  });
});

describe('task content', () => {
  it('gives every routine the same length, so no level has a thin pool', () => {
    for (const task of TASKS) {
      expect(task.steps).toHaveLength(7);
      expect(task.distractors).toHaveLength(3);
    }
  });

  it('has no duplicate steps inside a routine', () => {
    for (const task of TASKS) {
      expect(new Set(task.steps).size).toBe(task.steps.length);
    }
  });

  it('never uses a distractor that is also a real step', () => {
    for (const task of TASKS) {
      for (const d of task.distractors) expect(task.steps).not.toContain(d);
    }
  });
});
