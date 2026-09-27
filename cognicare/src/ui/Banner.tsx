import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { Surface } from '@/theme/contrast';
import { colors, radius, space } from '@/theme/tokens';
import type { IconName } from './Button';
import { SurfaceProvider } from './surface';
import { Text } from './Text';

type Tone = 'error' | 'warning' | 'success' | 'info';

const TONES: Record<Tone, { fill: string; edge: string; icon: IconName; surface: Surface }> = {
  error: { fill: colors.dangerSoft, edge: colors.danger, icon: 'alert-circle-outline', surface: 'dangerSoft' },
  warning: { fill: colors.warningSoft, edge: colors.warning, icon: 'warning-outline', surface: 'warningSoft' },
  success: { fill: colors.successSoft, edge: colors.success, icon: 'checkmark-circle-outline', surface: 'successSoft' },
  info: { fill: colors.surfaceRaised, edge: colors.edge, icon: 'hourglass-outline', surface: 'raised' },
};

type Props = {
  tone: Tone;
  children: ReactNode;
  /** Override the tone's icon when a clearer one exists (e.g. a sparkle for AI). */
  icon?: IconName;
};

/** Each tone has its own icon shape — never colour alone. */
export function Banner({ tone, children, icon }: Props) {
  const t = TONES[tone];
  return (
    <SurfaceProvider value={t.surface}>
      <View
        accessibilityRole={tone === 'error' ? 'alert' : undefined}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: space.sm + 4,
          backgroundColor: t.fill,
          borderWidth: 2,
          borderColor: t.edge,
          borderRadius: radius.md,
          padding: space.md,
        }}
      >
        <Ionicons name={icon ?? t.icon} size={24} color={t.edge} style={{ marginTop: 3 }} />
        <View style={{ flex: 1, gap: space.sm }}>
          {typeof children === 'string' ? <Text variant="body">{children}</Text> : children}
        </View>
      </View>
    </SurfaceProvider>
  );
}
