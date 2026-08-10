import * as Haptics from 'expo-haptics';
import { Pressable, type ViewStyle } from 'react-native';

import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'quiet';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  fullWidth = true,
  style,
}: Props) {
  const fill = {
    primary: colors.accent,
    secondary: colors.surface,
    quiet: 'transparent',
  }[variant];

  const textColor = variant === 'primary' ? 'textInverse' : 'accent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        // Confirms the tap landed. Matters when reaction time is slow enough
        // that the visual change alone reads as ambiguous.
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        {
          minHeight: TOUCH_MIN,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          borderRadius: radius.md,
          backgroundColor: disabled ? colors.disabled : fill,
          borderWidth: variant === 'secondary' ? 2 : 0,
          borderColor: colors.accent,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text variant="label" color={disabled ? 'textInverse' : textColor}>
        {label}
      </Text>
    </Pressable>
  );
}
