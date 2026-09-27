import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';

import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';
import type { IconName } from './Button';
import { SurfaceProvider } from './surface';
import { Text } from './Text';

type Props = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
};

/** A tappable example — the question is sent exactly as written. */
export function Chip({ label, onPress, icon = 'chatbox-ellipses-outline', disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: TOUCH_MIN,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm + 4,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radius.md,
        borderWidth: 2,
        borderColor: colors.edge,
        backgroundColor: colors.bg,
        opacity: pressed ? 0.85 : disabled ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={22} color={colors.accent} />
      <SurfaceProvider value="bg">
        <Text variant="label" style={{ flex: 1 }}>
          {label}
        </Text>
      </SurfaceProvider>
    </Pressable>
  );
}
