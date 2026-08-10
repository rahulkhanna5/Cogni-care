import type { Animal, Position } from './sounds';

export type ForestLevel = {
  /** how many sounds in a localisation round */
  localisationTrials: number;
  /** how many sounds play in a detection series */
  seriesLength: number;
  /** how many sounds to hold in a recall sequence */
  sequenceLength: number;
  /** silence between sounds */
  gapMs: number;
  /** centre only joins later — a three-way choice is much harder than two */
  positions: Position[];
  /** how many different animals are in play */
  animalCount: number;
};

const LR: Position[] = ['left', 'right'];
const LCR: Position[] = ['left', 'centre', 'right'];

export const FOREST_LEVELS: ForestLevel[] = [
  { localisationTrials: 4, seriesLength: 6, sequenceLength: 3, gapMs: 1300, positions: LR, animalCount: 2 },
  { localisationTrials: 4, seriesLength: 7, sequenceLength: 3, gapMs: 1200, positions: LR, animalCount: 3 },
  { localisationTrials: 5, seriesLength: 8, sequenceLength: 3, gapMs: 1100, positions: LR, animalCount: 3 },
  { localisationTrials: 5, seriesLength: 8, sequenceLength: 4, gapMs: 1050, positions: LR, animalCount: 3 },
  { localisationTrials: 5, seriesLength: 9, sequenceLength: 4, gapMs: 1000, positions: LCR, animalCount: 3 },
  { localisationTrials: 6, seriesLength: 10, sequenceLength: 4, gapMs: 950, positions: LCR, animalCount: 4 },
  { localisationTrials: 6, seriesLength: 10, sequenceLength: 4, gapMs: 900, positions: LCR, animalCount: 4 },
  { localisationTrials: 6, seriesLength: 11, sequenceLength: 5, gapMs: 850, positions: LCR, animalCount: 4 },
  { localisationTrials: 6, seriesLength: 12, sequenceLength: 5, gapMs: 800, positions: LCR, animalCount: 4 },
  { localisationTrials: 7, seriesLength: 12, sequenceLength: 5, gapMs: 750, positions: LCR, animalCount: 5 },
  { localisationTrials: 7, seriesLength: 13, sequenceLength: 5, gapMs: 700, positions: LCR, animalCount: 5 },
  { localisationTrials: 7, seriesLength: 13, sequenceLength: 6, gapMs: 650, positions: LCR, animalCount: 5 },
  { localisationTrials: 8, seriesLength: 14, sequenceLength: 6, gapMs: 600, positions: LCR, animalCount: 5 },
  { localisationTrials: 8, seriesLength: 14, sequenceLength: 6, gapMs: 550, positions: LCR, animalCount: 5 },
  { localisationTrials: 8, seriesLength: 15, sequenceLength: 6, gapMs: 500, positions: LCR, animalCount: 5 },
];

export const FOREST_MAX_LEVEL = FOREST_LEVELS.length;
export const FOREST_ROUNDS = 3; // one of each mini-game

export const forestLevel = (level: number): ForestLevel =>
  FOREST_LEVELS[Math.min(Math.max(level, 1), FOREST_MAX_LEVEL) - 1];

export const describeForestLevel = (level: number): string => {
  const s = forestLevel(level);
  return `${s.animalCount} animals, ${s.positions.length === 3 ? 'left, centre and right' : 'left and right'}`;
};

export type ForestMode = 'localise' | 'detect' | 'recall';

/** Rotates the three mini-games across the rounds of a session. */
export const modeForRound = (roundNo: number): ForestMode =>
  (['localise', 'detect', 'recall'] as const)[(roundNo - 1) % 3];

/* ------------------------------ trial builders ----------------------------- */

export type LocaliseTrial = { animal: Animal; position: Position };
export type SeriesItem = { animal: Animal; position: Position; isTarget: boolean };

export function buildLocalisation(
  spec: ForestLevel,
  animals: Animal[],
  rnd = Math.random
): LocaliseTrial[] {
  return Array.from({ length: spec.localisationTrials }, () => ({
    animal: animals[Math.floor(rnd() * animals.length)],
    position: spec.positions[Math.floor(rnd() * spec.positions.length)],
  }));
}

export function buildSeries(
  spec: ForestLevel,
  animals: Animal[],
  target: Animal,
  rnd = Math.random
): SeriesItem[] {
  const others = animals.filter((a) => a !== target);
  return Array.from({ length: spec.seriesLength }, () => {
    // Roughly a third targets: frequent enough to stay engaging, rare enough
    // that responding to everything scores badly.
    const isTarget = rnd() < 0.35 && others.length > 0;
    return {
      animal: isTarget ? target : others[Math.floor(rnd() * others.length)],
      position: spec.positions[Math.floor(rnd() * spec.positions.length)],
      isTarget,
    };
  });
}

export function buildSequence(spec: ForestLevel, animals: Animal[], rnd = Math.random): Animal[] {
  const seq: Animal[] = [];
  while (seq.length < spec.sequenceLength) {
    const next = animals[Math.floor(rnd() * animals.length)];
    // No immediate repeats: two identical sounds back to back are heard as one.
    if (seq.length === 0 || seq[seq.length - 1] !== next) seq.push(next);
  }
  return seq;
}
