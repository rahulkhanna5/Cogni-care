import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { Art } from '@/art/Art';
import type { ArtName } from '@/art/names';
import { colors, radius } from '@/theme/tokens';

export const BASKET_W = 150;
export const BASKET_H = 104;

const INK = colors.ink;
const ITEM = 32;

/**
 * A shopping basket that shows what is in it. Drawn in two layers — handle
 * behind, body in front — so collected items sit INSIDE it, peeking over the
 * rim, rather than floating on top: the basket filling up is the progress
 * the player can see without reading a number.
 */
export function Basket({ items, glowing = false }: { items: ArtName[]; glowing?: boolean }) {
  // Up to four across, a second row set back and a little higher.
  const placed = items.map((art, i) => {
    const row = Math.floor(i / 4);
    const col = i % 4;
    return { art, key: `${art}-${i}`, row, left: 22 + col * 26 + (row % 2) * 13, top: 24 - row * 12 };
  });

  return (
    <View style={{ width: BASKET_W, height: BASKET_H }} pointerEvents="none">
      {/* "Let go here": a coral ring while a carried item is over the basket. */}
      {glowing && (
        <View
          style={{
            position: 'absolute',
            left: -10,
            right: -10,
            top: -10,
            bottom: -6,
            borderRadius: radius.lg,
            borderWidth: 3,
            borderColor: colors.accent,
            backgroundColor: `${colors.accent}33`,
          }}
        />
      )}

      <Svg width={BASKET_W} height={BASKET_H} viewBox="0 0 150 104" style={{ position: 'absolute' }}>
        <Path d="M34 52 C34 4 116 4 116 52" stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" />
        <Path d="M34 52 C34 4 116 4 116 52" stroke="#E0A867" strokeWidth={4} fill="none" strokeLinecap="round" />
      </Svg>

      {/* Back row first, so the front row overlaps it. */}
      {[...placed].reverse().map((p) => (
        <View key={p.key} style={{ position: 'absolute', left: p.left, top: p.top }}>
          <Art name={p.art} size={ITEM} />
        </View>
      ))}

      <Svg width={BASKET_W} height={BASKET_H} viewBox="0 0 150 104" style={{ position: 'absolute' }}>
        <Path d="M12 50 L138 50 L124 100 L26 100 Z" fill="#C98A4B" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
        <Path d="M20 66 L130 66 M24 82 L126 82 M52 50 L56 100 M75 50 L75 100 M98 50 L94 100" stroke="#9A6330" strokeWidth={3} strokeLinecap="round" />
        <Rect x={8} y={44} width={134} height={12} rx={6} fill="#E0A867" stroke={INK} strokeWidth={3.5} />
      </Svg>
    </View>
  );
}
