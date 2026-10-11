/**
 * Every level of every game, actually drawn: a level that throws on render, or
 * that has no usable content, is found here rather than by a player.
 *
 * It renders the game's own play screen (the part GameShell mounts for each
 * turn) at each level, for each of the three turns a session rotates through
 * where the game rotates. A level that "exists" in a table but cannot be
 * built — a routine too short, a town with no route, a list longer than the
 * items available — fails here.
 */
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { BlinkTrail } from './blink-trail/BlinkTrail';
import { BLINK_MAX_LEVEL } from './blink-trail/levels';
import { DailyOrder } from './daily-order/DailyOrder';
import { DAILY_MAX_LEVEL, forgetTasks } from './daily-order/levels';
import { DualTaskFlow } from './dual-task-flow/DualTaskFlow';
import { DUAL_MAX_LEVEL } from './dual-task-flow/levels';
import { EmotionMeadow } from './emotion-meadow/EmotionMeadow';
import { MEADOW_MAX_LEVEL } from './emotion-meadow/levels';
import { MarketRush } from './market-rush/MarketRush';
import { MARKET_MAX_LEVEL } from './market-rush/levels';
import { PathFinder } from './path-finder/PathFinder';
import { PATH_MAX_LEVEL } from './path-finder/levels';
import { FOREST_MAX_LEVEL } from './sound-forest/levels';
import { SoundForest } from './sound-forest/SoundForest';
import { SpeedyCurrent } from './speedy-current/SpeedyCurrent';
import { CURRENT_MAX_LEVEL } from './speedy-current/levels';
import type { GamePlayProps } from './shell/types';

const props = (level: number, roundNo: number): GamePlayProps => ({
  level,
  roundNo,
  totalRounds: 4,
  onRoundComplete: () => undefined,
});

const GAMES: { name: string; levels: number; turns: number; make: (p: GamePlayProps) => ReactElement }[] = [
  { name: 'Blink Trail', levels: BLINK_MAX_LEVEL, turns: 1, make: (p) => <BlinkTrail {...p} /> },
  { name: 'Market Rush', levels: MARKET_MAX_LEVEL, turns: 1, make: (p) => <MarketRush {...p} /> },
  { name: 'Speedy Current', levels: CURRENT_MAX_LEVEL, turns: 1, make: (p) => <SpeedyCurrent {...p} /> },
  { name: 'Emotion Meadow', levels: MEADOW_MAX_LEVEL, turns: 1, make: (p) => <EmotionMeadow {...p} /> },
  // Sound Forest plays a different mini-game on each of three turns.
  { name: 'Sound Forest', levels: FOREST_MAX_LEVEL, turns: 3, make: (p) => <SoundForest {...p} /> },
  // Path Finder walks a different trip on each of three turns.
  { name: 'Path Finder', levels: PATH_MAX_LEVEL, turns: 3, make: (p) => <PathFinder {...p} /> },
  { name: 'Daily Order', levels: DAILY_MAX_LEVEL, turns: 4, make: (p) => <DailyOrder {...p} /> },
  { name: 'Dual Task Flow', levels: DUAL_MAX_LEVEL, turns: 1, make: (p) => <DualTaskFlow {...p} /> },
];

beforeEach(() => {
  jest.useFakeTimers();
  forgetTasks();
});
afterEach(() => jest.useRealTimers());

describe.each(GAMES)('$name', ({ levels, turns, make }) => {
  it('draws every level, on every turn, without error', async () => {
    for (let level = 1; level <= levels; level++) {
      for (let turn = 1; turn <= turns; turn++) {
        const view = await render(make(props(level, turn)));
        expect({ level, turn, drew: view.toJSON() !== null }).toEqual({ level, turn, drew: true });
        await view.unmount();
      }
    }
  });
});
