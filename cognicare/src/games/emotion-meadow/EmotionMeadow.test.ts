import { buildTrials } from './EmotionMeadow';
import type { Emotion } from './Face';

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
