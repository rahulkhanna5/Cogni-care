/**
 * Every game's levels, audited together: each level must be harder than the
 * one before it, and none may be easier on any axis.
 *
 * This exists because a client found Daily Order repeating its tasks as they
 * moved up — and because the audit that followed found levels that only
 * LOOKED different. Axes are the EFFECTIVE values: the number of faces
 * Emotion Meadow can actually show (capped by its pool of feelings), not the
 * number a table asked for.
 */
import { BLINK_LEVELS } from './blink-trail/levels';
import { DAILY_LEVELS } from './daily-order/levels';
import { DUAL_LEVELS } from './dual-task-flow/levels';
import { MEADOW_LEVELS } from './emotion-meadow/levels';
import { MARKET_LEVELS } from './market-rush/levels';
import { levelDifficulty } from './path-finder/engine/difficulty';
import { PATH_LEVELS } from './path-finder/levels';
import { FOREST_LEVELS } from './sound-forest/levels';
import { CURRENT_LEVELS } from './speedy-current/levels';

type Axis<T> = {
  name: string;
  /** which direction is harder */
  harder: 'up' | 'down';
  of: (level: T) => number;
};

function audit<T>(game: string, levels: T[], axes: Axis<T>[], atLeast: number) {
  describe(game, () => {
    it(`has at least ${atLeast} levels`, () => {
      expect(levels.length).toBeGreaterThanOrEqual(atLeast);
    });

    it('never gets easier on any axis from one level to the next', () => {
      for (let i = 1; i < levels.length; i++) {
        for (const axis of axes) {
          const before = axis.of(levels[i - 1]!);
          const now = axis.of(levels[i]!);
          const easier = axis.harder === 'up' ? now < before : now > before;
          expect({ level: i + 1, axis: axis.name, easier, before, now }).toMatchObject({ easier: false });
        }
      }
    });

    it('is strictly harder at every level — no level repeats the one before', () => {
      for (let i = 1; i < levels.length; i++) {
        const harder = axes.some((axis) => {
          const before = axis.of(levels[i - 1]!);
          const now = axis.of(levels[i]!);
          return axis.harder === 'up' ? now > before : now < before;
        });
        expect({ level: i + 1, harder }).toEqual({ level: i + 1, harder: true });
      }
    });
  });
}

audit(
  'Blink Trail',
  BLINK_LEVELS,
  [
    { name: 'lights', harder: 'up', of: (l) => l.length },
    { name: 'flash time', harder: 'down', of: (l) => l.flashMs },
    { name: 'replays', harder: 'down', of: (l) => l.replays },
  ],
  8
);

audit(
  'Market Rush',
  MARKET_LEVELS,
  [
    { name: 'list size', harder: 'up', of: (l) => l.listSize },
    { name: 'viewing time', harder: 'down', of: (l) => l.viewMs },
    { name: 'distractors', harder: 'up', of: (l) => l.distractorRatio },
    { name: 'travel time', harder: 'down', of: (l) => l.travelMs },
  ],
  10
);

audit(
  'Speedy Current',
  CURRENT_LEVELS,
  [
    { name: 'fish', harder: 'up', of: (l) => l.targetCount },
    { name: 'debris', harder: 'up', of: (l) => l.distractorCount },
    { name: 'from the top', harder: 'up', of: (l) => l.fromTop },
    { name: 'sharks', harder: 'up', of: (l) => l.forbiddenCount },
    { name: 'travel time', harder: 'down', of: (l) => l.travelMs },
  ],
  10
);

audit(
  'Emotion Meadow',
  MEADOW_LEVELS,
  [
    // The faces that really appear: a four-feeling pool cannot show five.
    { name: 'faces shown', harder: 'up', of: (l) => Math.min(l.faceCount, l.pool.length) },
    { name: 'feelings', harder: 'up', of: (l) => l.pool.length },
    // Subtlety only reaches the drawn faces, which a four-feeling pool never uses.
    { name: 'subtlety', harder: 'down', of: (l) => (l.pool.length > 4 ? l.intensity : 1) },
    { name: 'look-alikes', harder: 'up', of: (l) => l.similar },
  ],
  10
);

audit(
  'Sound Forest',
  FOREST_LEVELS,
  [
    { name: 'localisation trials', harder: 'up', of: (l) => l.localisationTrials },
    { name: 'series length', harder: 'up', of: (l) => l.seriesLength },
    { name: 'sequence length', harder: 'up', of: (l) => l.sequenceLength },
    { name: 'gap between sounds', harder: 'down', of: (l) => l.gapMs },
    { name: 'positions', harder: 'up', of: (l) => l.positions.length },
    { name: 'animals', harder: 'up', of: (l) => l.animalCount },
  ],
  10
);

audit(
  'Dual Task Flow',
  DUAL_LEVELS,
  [
    { name: 'step time', harder: 'down', of: (l) => l.stepMs },
    { name: 'items', harder: 'up', of: (l) => l.totalItems },
    { name: 'number range', harder: 'up', of: (l) => l.range },
  ],
  10
);

audit(
  'Daily Order',
  DAILY_LEVELS,
  [
    { name: 'steps', harder: 'up', of: (l) => l.stepCount },
    { name: 'wrong steps', harder: 'up', of: (l) => l.distractors },
  ],
  8
);

audit('Path Finder', PATH_LEVELS, [{ name: 'measured difficulty', harder: 'up', of: levelDifficulty }], 6);
