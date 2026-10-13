import {
  StyleSheet,
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { translateChildren, translateString } from '@/i18n/catalog';
import { useLanguage } from '@/i18n/language';
import { textColorOn, type TextColor } from '@/theme/contrast';
import { fonts, type TypeVariant, type as typeScale } from '@/theme/tokens';
import { useSurface } from './surface';

type Props = RNTextProps & {
  variant?: TypeVariant;
  color?: TextColor;
  center?: boolean;
};

const isHeavy = (weight: TextStyle['fontWeight']) =>
  weight === '600' || weight === '700' || weight === '800' || weight === 'bold';

export function Text({ variant = 'body', color = 'text', center, style, children, accessibilityLabel, ...rest }: Props) {
  const surface = useSurface();
  // Every word drawn by the app passes through here, so this is where the
  // chosen language is applied (i18n/catalog.ts).
  const lang = useLanguage((s) => s.lang);
  const base = typeScale[variant] as TextStyle;

  // A caller may still pass fontWeight in `style`. Android ignores it for a
  // custom font and falls back to the system face, so translate it into the
  // matching family and drop the weight itself.
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const weight = flat.fontWeight ?? base.fontWeight;
  const { fontWeight: _dropBase, ...baseRest } = base;
  const { fontWeight: _dropFlat, ...flatRest } = flat;

  return (
    <RNText
      // Respect the OS font-size setting, but cap it — past ~1.6x our game
      // layouts start clipping, and clipped text is worse than slightly small text.
      maxFontSizeMultiplier={1.6}
      style={[
        baseRest,
        { fontFamily: isHeavy(weight) ? fonts.semibold : fonts.regular },
        { color: textColorOn(color, surface) },
        center && { textAlign: 'center' },
        flatRest,
      ]}
      accessibilityLabel={accessibilityLabel ? translateString(lang, accessibilityLabel) : undefined}
      {...rest}
    >
      {translateChildren(lang, children)}
    </RNText>
  );
}
