import type { ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  /** Set false for game screens, which manage their own full-bleed layout. */
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
};

export function Screen({ children, scroll = true, padded = true, style }: Props) {
  const insets = useSafeAreaInsets();
  const pad: ViewStyle = {
    paddingTop: insets.top + (padded ? space.lg : 0),
    paddingBottom: insets.bottom + (padded ? space.lg : 0),
    paddingHorizontal: padded ? space.lg : 0,
  };

  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: colors.bg }, pad, style]}>{children}</View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[pad, { gap: space.md }, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
