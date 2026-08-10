import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { colors, type TypeVariant, type as typeScale } from '@/theme/tokens';

type Props = RNTextProps & {
  variant?: TypeVariant;
  color?: keyof Pick<typeof colors, 'text' | 'textMuted' | 'textInverse' | 'accent' | 'danger' | 'success' | 'warning'>;
  center?: boolean;
};

export function Text({ variant = 'body', color = 'text', center, style, ...rest }: Props) {
  const base = typeScale[variant] as TextStyle;
  return (
    <RNText
      // Respect the OS font-size setting, but cap it — past ~1.6x our game
      // layouts start clipping, and clipped text is worse than slightly small text.
      maxFontSizeMultiplier={1.6}
      style={[base, { color: colors[color] }, center && { textAlign: 'center' }, style]}
      {...rest}
    />
  );
}
