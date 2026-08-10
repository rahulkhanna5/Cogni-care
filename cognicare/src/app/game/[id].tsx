import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactElement } from 'react';

import { BlinkTrail } from '@/games/blink-trail/BlinkTrail';
import { BLINK_MAX_LEVEL, describeBlinkLevel } from '@/games/blink-trail/levels';
import { EmotionMeadow } from '@/games/emotion-meadow/EmotionMeadow';
import { describeMeadowLevel, MEADOW_MAX_LEVEL } from '@/games/emotion-meadow/levels';
import { MarketRush } from '@/games/market-rush/MarketRush';
import { describeMarketLevel, MARKET_MAX_LEVEL } from '@/games/market-rush/levels';
import { describePathLevel, PATH_MAX_LEVEL } from '@/games/path-finder/levels';
import { PathFinder } from '@/games/path-finder/PathFinder';
import { getGame, type GameId } from '@/games/registry';
import { GameShell } from '@/games/shell/GameShell';
import type { GamePlayProps } from '@/games/shell/types';
import { describeCurrentLevel, CURRENT_MAX_LEVEL } from '@/games/speedy-current/levels';
import { SpeedyCurrent } from '@/games/speedy-current/SpeedyCurrent';
import { space } from '@/theme/tokens';
import { Button, Screen, Text } from '@/ui';

type Entry = {
  maxLevel: number;
  rounds: number;
  describeLevel: (level: number) => string;
  instructions: string[];
  play: (props: GamePlayProps) => ReactElement;
};

/**
 * One place that knows how each game plugs into the shell. Adding a game is a
 * new entry here plus its own folder — nothing else in the app changes.
 */
const ENTRIES: Partial<Record<GameId, Entry>> = {
  'blink-trail': {
    maxLevel: BLINK_MAX_LEVEL,
    rounds: 5,
    describeLevel: describeBlinkLevel,
    instructions: [
      'Some squares will light up, one after another.',
      'Watch carefully and remember the order.',
      'When the grid comes back, tap them in the same order.',
    ],
    play: (p) => <BlinkTrail key={p.roundNo} {...p} />,
  },
  'market-rush': {
    maxLevel: MARKET_MAX_LEVEL,
    rounds: 4,
    describeLevel: describeMarketLevel,
    instructions: [
      'A shopping list appears for a few seconds.',
      'Remember what is on it, then it disappears.',
      'Items float down the screen — tap only the ones from your list.',
    ],
    play: (p) => <MarketRush key={p.roundNo} {...p} />,
  },
  'speedy-current': {
    maxLevel: CURRENT_MAX_LEVEL,
    rounds: 4,
    describeLevel: describeCurrentLevel,
    instructions: [
      'Fish swim upward against the current.',
      'Leaves and debris drift downward with it.',
      'Tap only the fish. Later on, leave the sharks alone.',
    ],
    play: (p) => <SpeedyCurrent key={p.roundNo} {...p} />,
  },
  'emotion-meadow': {
    maxLevel: MEADOW_MAX_LEVEL,
    rounds: 4,
    describeLevel: describeMeadowLevel,
    instructions: [
      'Several faces appear together.',
      'You will be asked to find one feeling, such as worried.',
      'Tap the face showing that feeling.',
    ],
    play: (p) => <EmotionMeadow key={p.roundNo} {...p} />,
  },
  'path-finder': {
    maxLevel: PATH_MAX_LEVEL,
    rounds: 3,
    describeLevel: describePathLevel,
    instructions: [
      'You start at the house and must reach the flag.',
      'Tap squares next to your route to build a path.',
      'Grey squares are blocked. Try to find the shortest way.',
    ],
    play: (p) => <PathFinder key={p.roundNo} {...p} />,
  },
};

export default function GameRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const meta = getGame(id);
  const entry = meta ? ENTRIES[meta.id] : undefined;

  if (!meta || !entry) {
    return (
      <Screen>
        <Text variant="display" style={{ marginTop: space.lg }}>
          {meta?.title ?? 'Not found'}
        </Text>
        <Text variant="body" color="textMuted">
          This game isn’t ready yet.
        </Text>
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <GameShell
      meta={meta}
      maxLevel={entry.maxLevel}
      roundsPerSession={entry.rounds}
      describeLevel={entry.describeLevel}
      instructions={entry.instructions}
      play={entry.play}
    />
  );
}
