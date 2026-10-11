import { buildTrials } from './EmotionMeadow';
import type { Emotion } from './Face';
import { LOOK_ALIKES, MEADOW_LEVELS } from './levels';

const POOL: Emotion[] = ['happy', 'sad', 'angry', 'surprised', 'worried', 'calm'];

describe('emotion trials', () => {
  it('points the answer index at a real face', () => {
    for (let i = 0; i < 200; i++) {
      const trials = buildTrials(POOL, 5, 4, Math.random);
      for (const trial of trials) {
        expect(trial.answer).toBeGreaterThanOrEqual(0);
        expect(trial.answer).toBeLessThan(trial.faces.length);
        expect(POOL).toContain(trial.faces[trial.answer]);
      }
    }
  });

  it('never shows the same emotion twice in one trial', () => {
    // Two faces with the same expression would make the prompt ambiguous and
    // one of the two correct answers would score as wrong.
    for (let i = 0; i < 200; i++) {
      for (const trial of buildTrials(POOL, 6, 4, Math.random)) {
        expect(new Set(trial.faces).size).toBe(trial.faces.length);
      }
    }
  });

  it('never asks for more faces than the pool can supply', () => {
    for (const trial of buildTrials(['happy', 'sad'], 5, 4, Math.random)) {
      expect(trial.faces).toHaveLength(2);
    }
  });
});

describe('look-alike trials', () => {
  const seeded = (seed: number) => {
    let n = seed;
    return () => {
      n = (n * 9301 + 49297) % 233280;
      return n / 233280;
    };
  };
  const hasTwin = (faces: Emotion[], target: Emotion) => LOOK_ALIKES[target].some((p) => faces.includes(p));

  it('puts the answer beside a feeling it is mistaken for, in exactly the share asked', () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const [similar, expected] of [
        [0.25, 1],
        [0.5, 2],
        [0.75, 3],
        [1, 4],
      ] as const) {
        const trials = buildTrials(POOL, 5, 4, seeded(seed), similar);
        const withTwin = trials.filter((t) => hasTwin(t.faces, t.faces[t.answer]!));
        // At least the asked-for number; chance can add more.
        expect(withTwin.length).toBeGreaterThanOrEqual(expected);
      }
    }
  });

  it('works inside the four-feeling pool too', () => {
    const easy: Emotion[] = ['happy', 'sad', 'angry', 'surprised'];
    for (let seed = 1; seed <= 100; seed++) {
      for (const t of buildTrials(easy, 4, 4, seeded(seed), 1)) {
        expect(hasTwin(t.faces, t.faces[t.answer]!)).toBe(true);
        expect(new Set(t.faces).size).toBe(t.faces.length);
        expect(t.faces).toHaveLength(4);
      }
    }
  });

  it('never asks the same question twice running', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const similar of [0, 0.5, 1]) {
        const trials = buildTrials(POOL, 4, 4, seeded(seed), similar);
        for (let i = 1; i < trials.length; i++) {
          expect(trials[i]!.faces[trials[i]!.answer]).not.toBe(trials[i - 1]!.faces[trials[i - 1]!.answer]);
        }
      }
    }
  });

  it('builds a sensible round at every level', () => {
    MEADOW_LEVELS.forEach((spec, i) => {
      for (let seed = 1; seed <= 40; seed++) {
        const trials = buildTrials(spec.pool, spec.faceCount, 4, seeded(seed), spec.similar);
        expect(trials).toHaveLength(4);
        for (const t of trials) {
          expect(t.faces).toHaveLength(Math.min(spec.faceCount, spec.pool.length));
          expect(new Set(t.faces).size).toBe(t.faces.length);
          expect(t.faces.every((f) => spec.pool.includes(f))).toBe(true);
          expect(t.answer).toBeGreaterThanOrEqual(0);
          expect(t.answer).toBeLessThan(t.faces.length);
        }
      }
      expect(i).toBeLessThan(MEADOW_LEVELS.length);
    });
  });
});
