import {
  buildLocalisation,
  buildSequence,
  buildSeries,
  detectTarget,
  forestLevel,
  FOREST_LEVELS,
  modeForRound,
} from './levels';
import type { Animal } from './sounds';

const ANIMALS: Animal[] = ['dog', 'crow', 'goat'];

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
    const series = buildSeries(forestLevel(5), ANIMALS, 'dog');
    for (const item of series) {
      expect(item.isTarget).toBe(item.animal === 'dog');
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

  it('builds a valid round at every level, with the animals that level uses', () => {
    const all: Animal[] = ['dog', 'crow', 'goat', 'cat', 'duck'];
    for (let level = 1; level <= FOREST_LEVELS.length; level++) {
      const spec = forestLevel(level);
      const animals = all.slice(0, spec.animalCount);
      for (let i = 0; i < 20; i++) {
        const target = detectTarget(level, all);
        expect(animals).toContain(target);

        const trials = buildLocalisation(spec, animals);
        expect(trials).toHaveLength(spec.localisationTrials);

        const series = buildSeries(spec, animals, target);
        expect(series).toHaveLength(spec.seriesLength);
        for (const item of series) expect(item.isTarget).toBe(item.animal === target);

        const seq = buildSequence(spec, animals);
        expect(seq).toHaveLength(spec.sequenceLength);
        for (let j = 1; j < seq.length; j++) expect(seq[j]).not.toBe(seq[j - 1]);
      }
    }
  });

  it('listens for a different animal on the next level, whatever the animal count does', () => {
    const all: Animal[] = ['dog', 'crow', 'goat', 'cat', 'duck'];
    for (let level = 1; level < FOREST_LEVELS.length; level++) {
      expect(detectTarget(level + 1, all)).not.toBe(detectTarget(level, all));
      // and it is always an animal that level actually plays
      const inPlay = all.slice(0, forestLevel(level).animalCount);
      expect(inPlay).toContain(detectTarget(level, all));
    }
  });
});
