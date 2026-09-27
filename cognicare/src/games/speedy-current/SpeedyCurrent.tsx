import { useMemo } from 'react';
import type { ImageSourcePropType } from 'react-native';

import { FallingBoard } from '@/games/shared/FallingBoard';
import { schedule } from '@/games/shared/falling';
import { endOf } from '@/games/shared/lanes';
import type { GamePlayProps } from '@/games/shell/types';
import { currentLayout } from './layout';
import { currentLevel, DRIFT, FISH, PREDATORS } from './levels';

/** The river the fish swim in. Pieces on it are framed tiles, so they read over any of it. */
const WATER: ImageSourcePropType = require('../../../assets/images/speedy-current.webp');

type Props = GamePlayProps & {
  /** Test seam: pin the layout so a round is reproducible. */
  random?: () => number;
};

export function SpeedyCurrent({ level, onRoundComplete, random = Math.random }: Props) {
  const spec = currentLevel(level);

  const specs = useMemo(
    () =>
      // In lanes, so nothing ever swims through or drifts on top of anything
      // else (see layout.ts).
      currentLayout(
        schedule({
          durationMs: spec.durationMs,
          travelMs: spec.travelMs,
          targetCount: spec.targetCount,
          distractorCount: spec.distractorCount,
          forbiddenCount: spec.forbiddenCount,
          targets: FISH,
          distractors: DRIFT,
          forbidden: PREDATORS,
          // Fish move against the flow; debris moves with it. That opposition is
          // the whole visual cue the player is learning to use.
          direction: 'up',
          distractorDirection: 'down',
          random,
        }),
        spec,
        random
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level]
  );
  // An item that waited for a free lane may finish a fraction past the
  // level's length; the turn runs until it has, rather than cut it off.
  const durationMs = Math.max(spec.durationMs, endOf(specs));

  return (
    <FallingBoard
      specs={specs}
      durationMs={durationMs}
      backdrop={WATER}
      prompt={
        spec.forbiddenCount > 0
          ? 'Tap the fish swimming up — never the sharks'
          : 'Tap only the fish swimming up'
      }
      targetNoun="fish"
      flow="down"
      // Swimmers are drawn facing left; turn them to face the way they go.
      // Sharks swim up too, so direction alone never gives them away.
      rotateFor={(item) => (item.direction === 'up' ? 90 : 0)}
      onFinish={onRoundComplete}
    />
  );
}
