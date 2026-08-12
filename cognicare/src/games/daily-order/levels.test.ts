import { buildTrial, DAILY_LEVELS, dailyLevel, eligibleTasks } from './levels';
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

  it('gets harder monotonically', () => {
    for (let i = 1; i < DAILY_LEVELS.length; i++) {
      const load = (l: { stepCount: number; distractors: number }) => l.stepCount + l.distractors;
      expect(load(DAILY_LEVELS[i]!)).toBeGreaterThanOrEqual(load(DAILY_LEVELS[i - 1]!));
    }
  });
});

describe('task content', () => {
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
