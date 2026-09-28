import type { ReactElement } from 'react';
import { Image, type ImageSourcePropType } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';
import type { Blocker, Place, Scenery } from './town';

export type TownArt = Place | Scenery | Blocker;

/**
 * Finished pictures, when you have them — PNGs with a transparent background,
 * one per name, generated from the prompts in the Path Finder plan. Put them
 * in assets/town/ and add a require() here; Metro needs literal paths, so this
 * cannot be a loop. Anything missing falls back to the drawing below, so the
 * set can arrive a few at a time.
 */
export const TOWN_IMAGES: Partial<Record<TownArt, ImageSourcePropType>> = {
  // home: require('../../../assets/town/home.png'),
  // hospital: require('../../../assets/town/hospital.png'),
  // school: require('../../../assets/town/school.png'),
  // police: require('../../../assets/town/police.png'),
  // 'house-blue': require('../../../assets/town/house-blue.png'),
  // 'house-green': require('../../../assets/town/house-green.png'),
  // 'house-tall': require('../../../assets/town/house-tall.png'),
  // trees: require('../../../assets/town/trees.png'),
  // broken: require('../../../assets/town/broken.png'),
  // accident: require('../../../assets/town/accident.png'),
  // construction: require('../../../assets/town/construction.png'),
};

const INK = colors.ink;
const O = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round' as const };

const house = (roof: string, wall = '#F4E9D8') => (
  <>
    <Rect x={22} y={46} width={56} height={40} fill={wall} {...O} />
    <Path d="M14 50 L50 18 L86 50 Z" fill={roof} {...O} />
    <Rect x={43} y={62} width={14} height={24} fill="#8A5A2B" {...O} strokeWidth={2.5} />
    <Rect x={28} y={56} width={11} height={11} fill="#9FD3F5" {...O} strokeWidth={2.5} />
    <Rect x={61} y={56} width={11} height={11} fill="#9FD3F5" {...O} strokeWidth={2.5} />
  </>
);

/** Stand-ins in the app's flat style, on a 100×100 grid with a dark outline. */
const DRAWINGS: Record<TownArt, () => ReactElement> = {
  home: () => (
    <>
      {house('#D9544D')}
      <Path d="M70 30 L70 20 L77 20 L77 36" fill="#8A5A2B" {...O} strokeWidth={2.5} />
    </>
  ),
  'house-blue': () => house('#4C8CC9'),
  'house-green': () => house('#5DAA4B'),
  'house-tall': () => (
    <>
      <Rect x={26} y={30} width={48} height={58} fill="#EFE0C8" {...O} />
      <Path d="M20 34 L50 12 L80 34 Z" fill="#9A6330" {...O} />
      {[40, 60].map((y) =>
        [33, 57].map((x) => <Rect key={`${x}-${y}`} x={x} y={y} width={10} height={10} fill="#9FD3F5" {...O} strokeWidth={2.5} />)
      )}
      <Rect x={44} y={72} width={12} height={16} fill="#8A5A2B" {...O} strokeWidth={2.5} />
    </>
  ),
  trees: () => (
    <>
      {[
        [30, 58, 18],
        [70, 58, 18],
        [50, 40, 21],
      ].map(([x, y, r]) => (
        <G key={`${x}`}>
          <Rect x={x - 3} y={y + r - 6} width={6} height={14} fill="#8A5A2B" {...O} strokeWidth={2.5} />
          <Circle cx={x} cy={y} r={r} fill="#4E9E45" {...O} />
        </G>
      ))}
    </>
  ),
  hospital: () => (
    <>
      <Rect x={14} y={30} width={72} height={58} fill="#FFFFFF" {...O} />
      <Rect x={14} y={24} width={72} height={10} fill="#DCE7F2" {...O} />
      <Rect x={41} y={38} width={18} height={30} fill="#E0463E" rx={2} />
      <Rect x={35} y={44} width={30} height={18} fill="#E0463E" rx={2} />
      <Rect x={43} y={74} width={14} height={14} fill="#9FD3F5" {...O} strokeWidth={2.5} />
    </>
  ),
  school: () => (
    <>
      <Rect x={12} y={44} width={76} height={44} fill="#F2C14E" {...O} />
      <Path d="M36 44 L50 20 L64 44 Z" fill="#C0392B" {...O} />
      <Circle cx={50} cy={36} r={5} fill="#FFF1D2" {...O} strokeWidth={2.5} />
      <Path d="M50 20 L50 8 L62 12 L50 16" fill="#4C8CC9" {...O} strokeWidth={2.5} />
      {[20, 38, 56, 70].map((x) => (
        <Rect key={x} x={x} y={54} width={10} height={10} fill="#9FD3F5" {...O} strokeWidth={2.5} />
      ))}
      <Rect x={44} y={70} width={12} height={18} fill="#8A5A2B" {...O} strokeWidth={2.5} />
    </>
  ),
  police: () => (
    <>
      <Rect x={14} y={32} width={72} height={56} fill="#DCE9F7" {...O} />
      <Rect x={14} y={32} width={72} height={16} fill="#2F5FA8" {...O} />
      <Path d="M50 56 L55 66 L66 67 L58 74 L60 85 L50 79 L40 85 L42 74 L34 67 L45 66 Z" fill="#F2C14E" {...O} strokeWidth={2.5} />
      <Circle cx={28} cy={40} r={3} fill="#E0463E" />
      <Circle cx={72} cy={40} r={3} fill="#4C8CC9" stroke="#FFFFFF" strokeWidth={1} />
    </>
  ),
  broken: () => (
    <>
      <Rect x={10} y={24} width={80} height={52} rx={10} fill="#7D7873" {...O} />
      <Path d="M22 50 L34 40 L42 54 L54 38 L62 56 L78 44" stroke={INK} strokeWidth={4} fill="none" strokeLinejoin="round" />
      <Path d="M44 58 C52 52 62 58 58 66 C52 72 42 66 44 58 Z" fill="#3F3B38" {...O} strokeWidth={2.5} />
      <Path d="M72 78 L80 52 L88 78 Z" fill="#F28C28" {...O} />
      <Rect x={75} y={64} width={10} height={5} fill="#FFFFFF" />
    </>
  ),
  accident: () => (
    <>
      <G transform="rotate(-18 34 58)">
        <Rect x={12} y={46} width={46} height={24} rx={8} fill="#E0463E" {...O} />
        <Rect x={22} y={50} width={14} height={9} fill="#9FD3F5" {...O} strokeWidth={2} />
      </G>
      <G transform="rotate(24 64 50)">
        <Rect x={44} y={38} width={44} height={24} rx={8} fill="#4C8CC9" {...O} />
        <Rect x={66} y={42} width={14} height={9} fill="#9FD3F5" {...O} strokeWidth={2} />
      </G>
      <Path d="M50 6 L68 36 L32 36 Z" fill="#F2C14E" {...O} />
      <Rect x={48} y={16} width={4} height={10} fill={INK} />
      <Circle cx={50} cy={30} r={2.4} fill={INK} />
    </>
  ),
  construction: () => (
    <>
      <Rect x={20} y={62} width={6} height={26} fill="#5E5A57" {...O} strokeWidth={2.5} />
      <Rect x={74} y={62} width={6} height={26} fill="#5E5A57" {...O} strokeWidth={2.5} />
      <Rect x={10} y={40} width={80} height={24} fill="#FFFFFF" {...O} />
      {[14, 34, 54, 74].map((x) => (
        <Path key={x} d={`M${x} 64 L${x + 12} 40 L${x + 20} 40 L${x + 8} 64 Z`} fill="#E0463E" />
      ))}
      <Rect x={10} y={40} width={80} height={24} fill="none" {...O} />
      <Circle cx={18} cy={32} r={6} fill="#F28C28" {...O} strokeWidth={2.5} />
      <Circle cx={82} cy={32} r={6} fill="#F28C28" {...O} strokeWidth={2.5} />
    </>
  ),
};

/** A building, some scenery or a road block — the finished picture if there is one. */
export function TownSprite({ art, size }: { art: TownArt; size: number }) {
  const image = TOWN_IMAGES[art];
  if (image) {
    // Explicit size: a bundled image otherwise takes its own pixel size.
    return <Image source={image} style={{ width: size, height: size }} resizeMode="contain" />;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {DRAWINGS[art]()}
    </Svg>
  );
}
