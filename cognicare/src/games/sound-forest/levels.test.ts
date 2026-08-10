import {
  buildLocalisation,
  buildSequence,
  buildSeries,
  forestLevel,
  FOREST_LEVELS,
  modeForRound,
} from './levels';
import type { Animal } from './sounds';

const ANIMALS: Animal[] = ['owl', 'bird', 'frog'];

describe('sound forest', () => {
  it('rotates through all three mini-games', () => {
    expect(modeForRound(1)).toBe('localise');
    expect(modeForRound(2)).toBe('detect');
    expect(modeForRound(3)).toBe('recall');
    expect(modeForRound(4)).toBe('localise');
  });

  it('only uses positions the level allows', () => {
    const spec = forestLevel(1);
    expect(spec.positions).toEqual(['left', 'right']); // no centre early on

    const trials = buildLocalisation(spec, ANIMALS);
    expect(trials).toHaveLength(spec.localisationTrials);
    for (const t of trials) {
      expect(spec.positions).toContain(t.position);
      expect(ANIMALS).toContain(t.animal);
    }
  });

  it('marks a series item as a target only when it is the target animal', () => {
    const series = buildSeries(forestLevel(5), ANIMALS, 'owl');
    for (const item of series) {
      expect(item.isTarget).toBe(item.animal === 'owl');
    }
  });

  it('never repeats a sound back to back in a recall sequence', () => {
    for (let i = 0; i < 50; i++) {
      const seq = buildSequence(forestLevel(12), ANIMALS);
      expect(seq).toHaveLength(forestLevel(12).sequenceLength);
      for (let j = 1; j < seq.length; j++) {
        expect(seq[j]).not.toBe(seq[j - 1]);
      }
    }
  });

  it('introduces centre only after the two-way choice is established', () => {
    const firstWithCentre = FOREST_LEVELS.findIndex((l) => l.positions.length === 3);
    expect(firstWithCentre).toBeGreaterThan(2);
    // Once centre appears it never goes away.
    for (let i = firstWithCentre; i < FOREST_LEVELS.length; i++) {
      expect(FOREST_LEVELS[i].positions).toHaveLength(3);
    }
  });

  it('shortens the gap between sounds as levels rise', () => {
    for (let i = 1; i < FOREST_LEVELS.length; i++) {
      expect(FOREST_LEVELS[i].gapMs).toBeLessThanOrEqual(FOREST_LEVELS[i - 1].gapMs);
    }
  });
});
