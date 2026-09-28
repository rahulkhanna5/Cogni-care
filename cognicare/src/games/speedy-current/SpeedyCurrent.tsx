import { useMemo } from 'react';
import type { ImageSourcePropType } from 'react-native';

import { FallingBoard } from '@/games/shared/FallingBoard';
import type { Faller } from '@/games/shared/falling';
import { endOf } from '@/games/shared/lanes';
import type { GamePlayProps } from '@/games/shell/types';
import { currentRound, isFish } from './layout';
import { currentLevel } from './levels';

/** The river the fish swim in; it flows downward, like the current. */
const WATER: ImageSourcePropType = require('../../../assets/images/speedy-current.webp');

type Props = GamePlayProps & {
  /** Test seam: pin the layout so a round is reproducible. */
  random?: () => number;
};

/** Swimmers are drawn facing left; turn each to face the way it goes. */
const facing = (item: Faller) => (item.direction === 'up' ? 90 : isFish(item) ? -90 : 0);

/**
 * What a screen reader says: the direction is the whole task, and a player
 * who cannot see the movement still needs to know it.
 */
const describe = (item: Faller) =>
  `${item.label}, ${item.direction === 'up' ? 'swimming up' : isFish(item) ? 'swimming down' : 'drifting down'}`;

export function SpeedyCurrent({ level, onRoundComplete, random = Math.random }: Props) {
  const spec = currentLevel(level);

  // Fish from both ends, sharks, and debris drifting down, in lanes so
  // nothing overlaps (see layout.ts).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const specs = useMemo(() => currentRound(spec, random), [level]);
  // An item that waited for a free lane may finish a fraction past the
  // level's length; the turn runs until it has, rather than cut it off.
  const durationMs = Math.max(spec.durationMs, endOf(specs));

  return (
    <FallingBoard
      specs={specs}
      durationMs={durationMs}
      backdrop={WATER}
      // Just the drawings: a fish or a leaf needs no word under it, and the
      // tiles hid the moving water.
      bare
      describe={describe}
      prompt={spec.forbiddenCount > 0 ? 'Tap every fish — never the sharks' : 'Tap every fish'}
      targetNoun="fish"
      flow="down"
      // Fish face the way they swim, so one coming down looks it.
      rotateFor={facing}
      onFinish={onRoundComplete}
    />
  );
}
