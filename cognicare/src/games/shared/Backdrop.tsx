import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
} from 'react-native';

import { colors, radius } from '@/theme/tokens';
import { useReduceMotion } from '@/ui';

type Props = {
  source: ImageSourcePropType;
  onLayout?: (e: LayoutChangeEvent) => void;
  testID?: string;
  /** Let the picture drift downward, like a current. Still under Reduce Motion. */
  flow?: 'down';
  children?: ReactNode;
};

/** The app background at ~18%: takes the glare off a bright picture. */
const SCRIM = `${colors.bg}2E`;

/**
 * How fast flowing water moves, in dp per second. Slow on purpose: well
 * under the pace of anything the player has to track, so the water reads as
 * a current without pulling the eye, and without the vection — the sense of
 * one's own motion — that a fast-moving background causes.
 */
export const WATER_SPEED = 24;

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
export function Backdrop({ source, onLayout, testID, flow, children }: Props) {
  const reduce = useReduceMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const moving = flow === 'down' && !reduce && size.height > 0;
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!moving) return;
    shift.setValue(0);
    const loop = Animated.loop(
      Animated.timing(shift, {
        toValue: 2 * size.height,
        duration: ((2 * size.height) / WATER_SPEED) * 1000,
        easing: Easing.linear,
        // Off the JS thread on a phone, so the board's own 30fps tick and
        // the water never compete. The web has no native driver.
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    loop.start();
    return () => loop.stop();
  }, [moving, size.height, shift]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
    onLayout?.(e);
  };

  return (
    <View
      testID={testID}
      onLayout={handleLayout}
      style={{ flex: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface }}
    >
      {moving ? (
        // Three tiles, the middle one mirrored top-to-bottom, so every join
        // meets its own reflection and no seam shows. Sliding them down by
        // two heights brings the first tile to exactly where the last one
        // started, and the loop restarts invisibly.
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: -2 * size.height,
            width: size.width,
            height: 3 * size.height,
            transform: [{ translateY: shift }],
          }}
        >
          {[false, true, false].map((mirrored, k) => (
            <Image
              key={k}
              source={source}
              resizeMode="cover"
              style={{
                position: 'absolute',
                left: 0,
                top: k * size.height,
                width: size.width,
                height: size.height,
                transform: mirrored ? [{ scaleY: -1 }] : undefined,
              }}
            />
          ))}
        </Animated.View>
      ) : (
        <Image
          source={source}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        />
      )}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: SCRIM }]} />
      {children}
    </View>
  );
}
