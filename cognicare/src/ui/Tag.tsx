import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';
import type { IconName } from './Button';
import { Text } from './Text';

/** A small non-interactive label, e.g. what a game trains. */
export function Tag({ label, icon }: { label: string; icon?: IconName }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
        paddingHorizontal: space.sm + 2,
        paddingVertical: 2,
        borderRadius: radius.pill,
        borderWidth: 1.5,
        borderColor: colors.edge,
      }}
    >
      {icon && <Ionicons name={icon} size={16} color={colors.textMuted} />}
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}
