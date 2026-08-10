import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { GAMES } from '@/games/registry';
import { colors, space } from '@/theme/tokens';
import { Card, Screen, Text } from '@/ui';

export default function Games() {
  const router = useRouter();
  return (
    <Screen>
      <View style={{ gap: space.xs, marginTop: space.sm }}>
        <Text variant="display">Games</Text>
        <Text variant="body" color="textMuted">
          Seven exercises. Each one trains something different.
        </Text>
      </View>

      {GAMES.map((game) => (
        <Card
          key={game.id}
          onPress={game.ready ? () => router.push(`/game/${game.id}`) : undefined}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Text variant="heading">{game.title}</Text>
            {game.needsHeadphones && (
              <Ionicons name="headset-outline" size={22} color={colors.textMuted} />
            )}
          </View>

          <Text variant="body" color="textMuted">
            {game.blurb}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Text variant="caption" color={game.ready ? 'success' : 'textMuted'}>
              {game.ready ? 'Tap to play' : 'Coming soon'}
            </Text>
            {game.ready && (
              <Ionicons name="chevron-forward" size={18} color={colors.success} />
            )}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
