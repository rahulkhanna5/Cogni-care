import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
};

export function Card({ children, onPress, style }: Props) {
  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
    minHeight: onPress ? TOUCH_MIN : undefined,
  };

  if (!onPress) return <View style={[base, style]}>{children}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [base, { opacity: pressed ? 0.9 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}
