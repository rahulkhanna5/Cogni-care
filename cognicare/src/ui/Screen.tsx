import { createContext, useContext, type ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';
import { SurfaceProvider } from './surface';

type Props = {
  children: ReactNode;
  /** Set false for game screens, which manage their own full-bleed layout. */
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
};

/** True under a navigator whose top bar already covers the status-bar inset. */
export const BarAbove = createContext(false);

export function Screen({ children, scroll = true, padded = true, style }: Props) {
  const insets = useSafeAreaInsets();
  const barAbove = useContext(BarAbove);
  const pad: ViewStyle = {
    paddingTop: (barAbove ? 0 : insets.top) + (padded ? space.lg : 0),
    paddingBottom: insets.bottom + (padded ? space.lg : 0),
    // 16dp, not 24: on a 360dp phone every 8dp of gutter is 8dp less room for
    // 20sp text, which is the difference between one line and two.
    paddingHorizontal: padded ? space.gutter : 0,
  };

  // Screens are the page: whatever sits directly on them is on `bg`.
  if (!scroll) {
    return (
      <SurfaceProvider value="bg">
        <View style={[{ flex: 1, backgroundColor: colors.bg }, pad, style]}>{children}</View>
      </SurfaceProvider>
    );
  }

  return (
    <SurfaceProvider value="bg">
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={[pad, { gap: space.md }, style]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SurfaceProvider>
  );
}
