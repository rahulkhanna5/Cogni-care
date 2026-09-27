import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';

import { colors, radius, space, TOUCH_LARGE, TOUCH_MIN } from '@/theme/tokens';
import { SurfaceProvider, useSurface } from './surface';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'quiet';
export type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  /** Shows a spinner beside the label and blocks further taps. */
  busy?: boolean;
  /**
   * Why the button cannot be pressed yet, shown under it while disabled. A
   * greyed-out button with no reason reads to this audience as "broken".
   */
  disabledReason?: string;
  icon?: IconName;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  busy,
  disabledReason,
  icon,
  fullWidth = true,
  accessibilityLabel,
  style,
}: Props) {
  const outer = useSurface();
  const blocked = !!disabled || !!busy;
  // Disabled is shown by shape — a dashed edge on a raised fill — not by
  // dimming alone, which is indistinguishable from "low contrast" for this group.
  const looksDisabled = !!disabled && !busy;

  const quiet = variant === 'quiet';

  const fill = looksDisabled
    ? quiet
      ? 'transparent'
      : colors.surfaceRaised
    : { primary: colors.accent, secondary: colors.bg, quiet: 'transparent' }[variant];

  // The surface the label sits on. A secondary button carries its own page-
  // coloured fill, so plain coral text stays at 8:1 even when the button is on
  // a card. A quiet button has no fill and inherits whatever it sits on.
  const labelSurface = looksDisabled ? (quiet ? outer : 'raised') : quiet ? outer : 'bg';

  const textColor = looksDisabled ? 'textMuted' : variant === 'primary' ? 'textInverse' : 'accent';
  const inkForIcons =
    looksDisabled
      ? colors.textMuted
      : variant === 'primary'
        ? colors.textInverse
        : outer === 'bg' || variant === 'secondary'
          ? colors.accent
          : colors.accentOnCard;

  return (
    <View style={[{ alignSelf: fullWidth ? 'stretch' : 'center', gap: space.xs }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: blocked, busy: !!busy }}
        accessibilityHint={looksDisabled ? disabledReason : undefined}
        disabled={blocked}
        onPress={() => {
          // Confirms the tap landed. Matters when reaction time is slow enough
          // that the visual change alone reads as ambiguous.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => ({
          minHeight: quiet ? TOUCH_MIN : TOUCH_LARGE,
          flexDirection: 'row',
          gap: space.sm,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: quiet ? space.sm : space.lg,
          paddingVertical: space.sm,
          borderRadius: radius.pill,
          backgroundColor: fill,
          borderWidth: quiet ? 0 : variant === 'secondary' || looksDisabled ? 2 : 0,
          borderStyle: looksDisabled ? 'dashed' : 'solid',
          borderColor: looksDisabled ? colors.edge : colors.accent,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        {busy && (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? colors.textInverse : colors.accent}
          />
        )}
        {!busy && icon && <Ionicons name={icon} size={22} color={inkForIcons} />}
        <SurfaceProvider value={labelSurface}>
          <Text
            variant="label"
            color={textColor}
            center
            style={quiet && !looksDisabled ? { textDecorationLine: 'underline' } : undefined}
          >
            {label}
          </Text>
        </SurfaceProvider>
      </Pressable>

      {looksDisabled && disabledReason ? (
        <Text variant="caption" color="textMuted" center>
          {disabledReason}
        </Text>
      ) : null}
    </View>
  );
}
