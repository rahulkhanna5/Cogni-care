import { View } from 'react-native';

import { useSession } from '@/store/session';
import { space } from '@/theme/tokens';
import { Card, Screen, Text } from '@/ui';

export default function Dashboard() {
  const player = useSession((s) => s.player);

  return (
    <Screen>
      <View style={{ gap: space.xs, marginTop: space.sm }}>
        <Text variant="display">Hello, {player?.name ?? 'there'}</Text>
        <Text variant="body" color="textMuted">
          Your progress will appear here once you start playing.
        </Text>
      </View>

      {/*
        Two separate panels, never merged. The questionnaire measures how the
        player feels they are doing; the games measure what they actually did.
        A single combined "improvement" number would imply a causal link the
        data cannot support. See ARCHITECTURE.md §3.
      */}
      <Card>
        <Text variant="heading">Trained</Text>
        <Text variant="body" color="textMuted">
          Games played, accuracy, and reaction time. Higher is better.
        </Text>
        <Text variant="caption" color="textMuted">
          No sessions yet.
        </Text>
      </Card>

      <Card>
        <Text variant="heading">Self-reported</Text>
        <Text variant="body" color="textMuted">
          Your check-in answers across the five areas. Lower is better.
        </Text>
        <Text variant="caption" color="textMuted">
          No check-in yet.
        </Text>
      </Card>
    </Screen>
  );
}
