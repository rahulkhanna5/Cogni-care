import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';

/**
 * A large tick box with its label beside it. The whole row is the target
 * (56dp tall at least), the box is 28dp with a 2dp edge that clears 3:1, and
 * the state is a tick, not only a colour.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Read by screen readers; the visible label is `children`. */
  label: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space.md,
        minHeight: TOUCH_MIN,
        paddingVertical: 6,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          marginTop: 2,
          borderRadius: radius.sm / 2,
          borderWidth: 2,
          borderColor: checked ? colors.accentBright : colors.edge,
          backgroundColor: checked ? colors.accent : colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && <Ionicons name="checkmark" size={20} color={colors.textInverse} />}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}
