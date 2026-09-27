import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';
import { SurfaceProvider } from './surface';

type Tone = 'surface' | 'raised' | 'selected';

type Props = {
  children: ReactNode;
  /** Makes the whole card one tap target, with a chevron as the visible cue. */
  onPress?: () => void;
  tone?: Tone;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

const FILL: Record<Tone, string> = {
  surface: colors.surface,
  raised: colors.surfaceRaised,
  selected: colors.selected,
};

/** Plain card — surface, radius 24, padding 24. */
export function Card({ children, onPress, tone = 'surface', accessibilityLabel, style }: Props) {
  const base: ViewStyle = {
    backgroundColor: FILL[tone],
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    ...(tone === 'selected' ? { borderWidth: 3, borderColor: colors.accent } : null),
  };

  if (!onPress) {
    return (
      <SurfaceProvider value={tone}>
        <View style={[base, style]}>{children}</View>
      </SurfaceProvider>
    );
  }

  return (
    <SurfaceProvider value={tone}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [
          base,
          { flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.9 : 1 },
          style,
        ]}
      >
        <View style={{ flex: 1, gap: space.sm }}>{children}</View>
        <Ionicons name="chevron-forward" size={26} color={colors.accentOnCard} />
      </Pressable>
    </SurfaceProvider>
  );
}
