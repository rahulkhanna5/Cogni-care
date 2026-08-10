import { useLocalSearchParams, useRouter } from 'expo-router';

import { BlinkTrail } from '@/games/blink-trail/BlinkTrail';
import { BLINK_MAX_LEVEL, describeBlinkLevel } from '@/games/blink-trail/levels';
import { getGame } from '@/games/registry';
import { GameShell } from '@/games/shell/GameShell';
import { space } from '@/theme/tokens';
import { Button, Screen, Text } from '@/ui';

const ROUNDS_PER_SESSION = 5;

export default function GameRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const meta = getGame(id);

  if (!meta || !meta.ready) {
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

  if (meta.id === 'blink-trail') {
    return (
      <GameShell
        meta={meta}
        maxLevel={BLINK_MAX_LEVEL}
        roundsPerSession={ROUNDS_PER_SESSION}
        describeLevel={describeBlinkLevel}
        instructions={[
          'Some squares will light up, one after another.',
          'Watch carefully and remember the order.',
          'When the grid comes back, tap them in the same order.',
        ]}
        play={(props) => <BlinkTrail key={props.roundNo} {...props} />}
      />
    );
  }

  return null;
}
