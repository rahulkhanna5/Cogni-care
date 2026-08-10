import { useMemo } from 'react';

import { FallingBoard } from '@/games/shared/FallingBoard';
import { schedule } from '@/games/shared/falling';
import type { GamePlayProps } from '@/games/shell/types';
import { currentLevel, DRIFT, FISH, PREDATORS } from './levels';

type Props = GamePlayProps & {
  /** Test seam: pin the layout so a round is reproducible. */
  random?: () => number;
};

export function SpeedyCurrent({ level, onRoundComplete, random = Math.random }: Props) {
  const spec = currentLevel(level);

  const specs = useMemo(
    () =>
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level]
  );

  return (
    <FallingBoard
      specs={specs}
      durationMs={spec.durationMs}
      prompt={
        spec.forbiddenCount > 0
          ? 'Tap the fish swimming up — never the sharks'
          : 'Tap only the fish swimming up'
      }
      onFinish={onRoundComplete}
    />
  );
}
