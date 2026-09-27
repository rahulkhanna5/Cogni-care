import type { ReactNode } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
} from 'react-native';

import { colors, radius } from '@/theme/tokens';

type Props = {
  source: ImageSourcePropType;
  onLayout?: (e: LayoutChangeEvent) => void;
  testID?: string;
  children?: ReactNode;
};

/** The app background at ~18%: takes the glare off a bright picture. */
const SCRIM = `${colors.bg}2E`;

/**
 * A picture behind a game board. It is scenery, never information — nothing
 * may be readable only against it. Pieces on a picture use Sprite's `framed`
 * tile, which carries its own light fill and dark ring and so reads over any
 * part of the image; text goes on a Card.
 *
 * Not ImageBackground: that hands onLayout to its inner Image, and a bundled
 * image defaults to its own pixel size, which absoluteFill does not override.
 * The picture drew at 941×1672 — a zoomed-in corner of the aisle — and the
 * board measured itself that wide, so items fell outside the visible part.
 */
export function Backdrop({ source, onLayout, testID, children }: Props) {
  return (
    <View
      testID={testID}
      onLayout={onLayout}
      style={{ flex: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface }}
    >
      <Image
        source={source}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: SCRIM }]} />
      {children}
    </View>
  );
}
