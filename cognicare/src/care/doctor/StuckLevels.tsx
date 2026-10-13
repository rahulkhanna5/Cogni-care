import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import type { ServerRound } from '@/api/doctor.api';
import { getGame } from '@/games/registry';
import { colors, space } from '@/theme/tokens';
import { Banner, Text } from '@/ui';
import { levelRows, stuckLine } from '../report/levels';

/**
 * The levels where a patient keeps having hard rounds, in plain words, with
 * whether the trouble is missing things or tapping the wrong things. Nothing
 * is shown when no level qualifies — a calm screen is the good news.
 */
export function StuckLevels({ rounds }: { rounds: ServerRound[] }) {
  const stuck = levelRows(rounds).filter((r) => r.stuck);
  if (stuck.length === 0) return null;
  return (
    <Banner tone="warning" icon="flag-outline">
      <Text variant="label">Where they get stuck</Text>
      <View style={{ gap: space.xs }}>
        {stuck.map((r) => (
          <View key={`${r.gameId}-${r.level}`} style={{ flexDirection: 'row', gap: space.sm }}>
            <Ionicons name="ellipse" size={8} color={colors.warning} style={{ marginTop: 8 }} />
            <Text variant="body" style={{ flex: 1 }}>
              {stuckLine(r, getGame(r.gameId)?.title ?? r.gameId)}
            </Text>
          </View>
        ))}
      </View>
    </Banner>
  );
}
