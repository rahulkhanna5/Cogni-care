import type { ReactElement } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';
import type { ArtName } from './names';

/**
 * Flat illustrations, drawn on a 100×100 grid with a dark ink outline so each
 * reads on the light tile at any size. Replaces emoji, which render
 * differently on every Android version — a player could learn "the fish" on
 * one phone and not recognise it on another.
 *
 * Shapes are deliberately simple and chunky: at 40dp an illustration has to
 * be recognisable at a glance, not admired.
 */

const INK = colors.ink;
const O = {
  stroke: INK,
  strokeWidth: 3.5,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
};
const line = (w = 3) => ({ stroke: INK, strokeWidth: w, strokeLinecap: 'round' as const, fill: 'none' });

const fishBody = 'M16 50 C28 30 58 28 70 50 C58 72 28 70 16 50 Z';
const fishTail = 'M68 50 L88 34 L84 50 L88 66 Z';
const leafShape = 'M50 12 C78 28 80 64 50 88 C20 64 22 28 50 12 Z';

const DRAWINGS: Record<ArtName, () => ReactElement> = {
  /* -------------------------------- groceries ------------------------------- */
  bread: () => (
    <>
      <Path
        d="M20 50 C20 32 34 24 50 24 C66 24 80 32 80 50 C80 55 77 58 74 58 L74 80 C74 83 72 85 69 85 L31 85 C28 85 26 83 26 80 L26 58 C23 58 20 55 20 50 Z"
        fill="#E3A65F"
        {...O}
      />
      <Path d="M38 34 L45 44 M50 32 L57 42 M62 34 L67 42" {...line(3)} />
    </>
  ),
  milk: () => (
    <>
      <Path d="M30 36 L40 20 L60 20 L70 36 Z" fill="#DCE7F2" {...O} />
      <Rect x={30} y={36} width={40} height={50} fill="#FFFFFF" />
      <Rect x={30} y={52} width={40} height={16} fill="#5B8FD6" />
      <Rect x={30} y={36} width={40} height={50} rx={2} fill="none" {...O} />
      <Rect x={43} y={11} width={14} height={9} rx={2} fill="#5B8FD6" {...O} />
    </>
  ),
  eggs: () => (
    <>
      <Ellipse cx={40} cy={54} rx={17} ry={23} fill="#FFF7EA" {...O} />
      <Ellipse cx={62} cy={60} rx={16} ry={21} fill="#F1D9B8" {...O} />
    </>
  ),
  banana: () => (
    <>
      <Path
        d="M24 26 C26 60 50 80 80 74 C83 73 84 69 81 67 C58 68 40 52 33 24 C32 20 24 21 24 26 Z"
        fill="#F6D04D"
        {...O}
      />
      <Path d="M36 32 C42 52 56 62 74 67" stroke="#C99A1E" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d="M27 24 L25 15" {...line(5)} />
    </>
  ),
  apple: () => (
    <>
      <Path
        d="M50 32 C42 24 22 26 22 50 C22 72 36 86 50 80 C64 86 78 72 78 50 C78 26 58 24 50 32 Z"
        fill="#E4493F"
        {...O}
      />
      <Path d="M50 32 C50 26 51 22 54 17" stroke="#6B4423" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M55 24 C60 14 72 14 75 16 C72 26 62 29 55 24 Z" fill="#5DAA4B" {...O} />
      <Ellipse cx={35} cy={47} rx={4.5} ry={8} fill="#FFFFFF" opacity={0.5} />
    </>
  ),
  cheese: () => (
    <>
      <Path d="M14 64 L60 30 L86 44 L86 76 L14 76 Z" fill="#F7C744" {...O} />
      <Path d="M14 64 L86 44" {...line(3)} />
      <Circle cx={32} cy={69} r={4.5} fill="#D69A22" />
      <Circle cx={56} cy={63} r={4} fill="#D69A22" />
      <Circle cx={73} cy={67} r={3.5} fill="#D69A22" />
      <Circle cx={58} cy={42} r={3} fill="#D69A22" />
    </>
  ),
  rice: () => (
    <>
      <Path d="M22 50 C22 34 78 34 78 50 Z" fill="#FFFFFF" {...O} />
      <Ellipse cx={40} cy={43} rx={3} ry={1.8} fill="#DCD3C6" />
      <Ellipse cx={52} cy={40} rx={3} ry={1.8} fill="#DCD3C6" />
      <Ellipse cx={62} cy={45} rx={3} ry={1.8} fill="#DCD3C6" />
      <Path d="M16 50 L84 50 C84 70 70 84 50 84 C30 84 16 70 16 50 Z" fill="#5B8FD6" {...O} />
      <Path d="M24 62 L76 62" stroke="#FFFFFF" strokeWidth={3} opacity={0.75} />
    </>
  ),
  tomato: () => (
    <>
      <Circle cx={50} cy={57} r={29} fill="#E24B3B" {...O} />
      <Path
        d="M50 32 C44 24 36 26 33 30 C40 30 44 33 50 36 C56 33 60 30 67 30 C64 26 56 24 50 32 Z"
        fill="#4E9A45"
        {...O}
        strokeWidth={2.5}
      />
      <Path d="M50 31 L50 20" stroke="#4E9A45" strokeWidth={4} strokeLinecap="round" />
      <Ellipse cx={37} cy={53} rx={4.5} ry={8} fill="#FFFFFF" opacity={0.45} />
    </>
  ),
  carrot: () => (
    <>
      <Path d="M50 34 C44 22 38 18 31 18 C35 25 42 30 46 34 Z" fill="#4E9A45" {...O} />
      <Path d="M50 34 C50 22 52 14 56 9 C58 18 56 28 54 34 Z" fill="#5DAA4B" {...O} />
      <Path d="M52 34 C58 24 66 20 72 22 C68 28 60 32 54 34 Z" fill="#4E9A45" {...O} />
      <Path d="M32 34 L68 34 L53 88 C52 91 48 91 47 88 Z" fill="#F28A26" {...O} />
      <Path d="M40 48 L48 48 M46 62 L54 62 M46 75 L51 75" {...line(2.5)} />
    </>
  ),
  fish: () => (
    <>
      <Path d={fishTail} fill="#4775B5" {...O} />
      <Path d={fishBody} fill="#5B8FD6" {...O} />
      <Path d="M44 38 C48 44 48 56 44 62" {...line(2.5)} />
      <Circle cx={30} cy={46} r={4.5} fill={INK} />
    </>
  ),
  tea: () => (
    <>
      <Path d="M40 30 C36 24 44 19 40 11 M54 30 C50 24 58 19 54 11" stroke="#9C8F86" strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <Ellipse cx={50} cy={80} rx={34} ry={8} fill="#E6EDF4" {...O} />
      <Path d="M72 46 C85 46 85 66 69 64" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M24 40 L72 40 L68 70 C67 76 62 80 56 80 L40 80 C34 80 29 76 28 70 Z" fill="#FFFFFF" {...O} />
      <Ellipse cx={48} cy={40} rx={24} ry={5} fill="#A0612E" {...O} />
    </>
  ),
  honey: () => (
    <>
      <Rect x={26} y={30} width={48} height={56} rx={14} fill="#F0A73A" {...O} />
      <Rect x={30} y={18} width={40} height={14} rx={4} fill="#8A5A2B" {...O} />
      <Rect x={34} y={50} width={32} height={20} rx={4} fill="#FFF1D2" {...O} strokeWidth={2.5} />
      <Path d="M42 32 C42 38 46 38 46 44" stroke="#C97F1E" strokeWidth={4} fill="none" strokeLinecap="round" />
    </>
  ),
  orange: () => (
    <>
      <Circle cx={50} cy={55} r={30} fill="#F7962D" {...O} />
      <Path d="M50 26 L48 17" stroke="#6B4423" strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M51 25 C55 16 65 14 71 16 C67 24 59 27 51 25 Z" fill="#5DAA4B" {...O} />
      <Circle cx={40} cy={52} r={1.8} fill="#D97A1C" />
      <Circle cx={60} cy={62} r={1.8} fill="#D97A1C" />
      <Circle cx={62} cy={46} r={1.8} fill="#D97A1C" />
      <Circle cx={47} cy={70} r={1.8} fill="#D97A1C" />
      <Ellipse cx={37} cy={46} rx={4} ry={7} fill="#FFFFFF" opacity={0.4} />
    </>
  ),
  potato: () => (
    <>
      <Path
        d="M20 54 C18 36 38 26 56 30 C74 34 86 46 82 62 C78 78 58 86 40 82 C28 78 21 68 20 54 Z"
        fill="#C99A5E"
        {...O}
      />
      <Circle cx={36} cy={47} r={2.5} fill="#7E5A31" />
      <Circle cx={58} cy={42} r={2.5} fill="#7E5A31" />
      <Circle cx={66} cy={62} r={2.5} fill="#7E5A31" />
      <Circle cx={44} cy={68} r={2.5} fill="#7E5A31" />
    </>
  ),
  onion: () => (
    <>
      <Path d="M50 20 L47 9 M50 20 L55 10" stroke="#4E9A45" strokeWidth={4} strokeLinecap="round" />
      <Path
        d="M50 20 C58 34 80 42 80 62 C80 78 66 86 50 86 C34 86 20 78 20 62 C20 42 42 34 50 20 Z"
        fill="#B5669B"
        {...O}
      />
      <Path d="M50 24 C44 42 42 62 50 84 M50 24 C56 42 58 62 50 84" {...line(2)} />
      <Path d="M44 86 L42 92 M50 86 L50 93 M56 86 L58 92" {...line(2)} />
    </>
  ),
  butter: () => (
    <>
      <Ellipse cx={50} cy={72} rx={38} ry={12} fill="#E6EDF4" {...O} />
      <Path d="M26 64 L26 50 L40 58 L40 72 Z" fill="#F0CE4E" {...O} />
      <Path d="M40 58 L76 50 L76 64 L40 72 Z" fill="#F6DB67" {...O} />
      <Path d="M26 50 L62 42 L76 50 L40 58 Z" fill="#FCEB93" {...O} />
    </>
  ),
  grapes: () => (
    <>
      <Path d="M50 32 L50 18" stroke="#6B4423" strokeWidth={4} strokeLinecap="round" />
      <Path d="M51 21 C58 11 70 12 73 16 C67 25 58 26 51 21 Z" fill="#5DAA4B" {...O} />
      {[
        [34, 40],
        [50, 40],
        [66, 40],
        [42, 55],
        [58, 55],
        [50, 70],
      ].map(([cx, cy]) => (
        <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={9.5} fill="#8E5CC2" {...O} strokeWidth={3} />
      ))}
    </>
  ),
  corn: () => (
    <>
      <Path d="M50 14 C62 14 68 32 68 52 C68 72 60 86 50 86 C40 86 32 72 32 52 C32 32 38 14 50 14 Z" fill="#F7D04A" {...O} />
      <Path d="M36 30 L64 30 M34 42 L66 42 M33 54 L67 54 M35 66 L65 66 M42 22 L42 80 M50 16 L50 84 M58 22 L58 80" stroke="#D1A21F" strokeWidth={2} />
      <Path d="M50 88 C34 82 22 64 24 40 C32 54 40 66 50 72 Z" fill="#6DBE4B" {...O} />
      <Path d="M50 88 C66 82 78 64 76 40 C68 54 60 66 50 72 Z" fill="#5DAA4B" {...O} />
    </>
  ),

  /* ------------------------- household and packaged ------------------------- */
  // Each keeps one unmistakable silhouette, so none reads as another product
  // at 40dp: a bar with bubbles, a pump bottle, a box with a bowl, a tube, a
  // carton with a straw, a stack of rounds, a jug with a handle.
  soap: () => (
    <>
      <Circle cx={30} cy={26} r={7} fill="#FFFFFF" {...O} strokeWidth={2.5} />
      <Circle cx={46} cy={18} r={5} fill="#FFFFFF" {...O} strokeWidth={2.5} />
      <Rect x={16} y={40} width={68} height={40} rx={18} fill="#F2A7C3" {...O} />
      <Rect x={28} y={51} width={44} height={18} rx={9} fill="none" stroke="#C7668C" strokeWidth={3} />
    </>
  ),
  shampoo: () => (
    <>
      <Path d="M50 22 L50 12 L66 12" {...line(4)} />
      <Rect x={42} y={22} width={16} height={12} rx={3} fill="#4C8CC9" {...O} />
      <Path d="M32 42 C32 36 38 34 42 34 L58 34 C62 34 68 36 68 42 L68 84 C68 87 66 89 63 89 L37 89 C34 89 32 87 32 84 Z" fill="#7FC4E8" {...O} />
      <Rect x={38} y={52} width={24} height={22} rx={4} fill="#FFFFFF" {...O} strokeWidth={2.5} />
    </>
  ),
  cereal: () => (
    <>
      <Rect x={22} y={12} width={56} height={78} rx={4} fill="#F2B233" {...O} />
      <Path d="M32 56 L68 56 C68 70 60 78 50 78 C40 78 32 70 32 56 Z" fill="#FFFFFF" {...O} />
      <Circle cx={42} cy={51} r={5} fill="#C9782C" {...O} strokeWidth={2.5} />
      <Circle cx={54} cy={49} r={5} fill="#C9782C" {...O} strokeWidth={2.5} />
      <Rect x={30} y={22} width={40} height={14} rx={3} fill="#D9402B" {...O} strokeWidth={2.5} />
    </>
  ),
  toothpaste: () => (
    <>
      <Path d="M18 36 L70 30 L70 70 L18 64 Z" fill="#FFFFFF" {...O} />
      <Path d="M18 36 L18 64" stroke="#3E8ED0" strokeWidth={8} strokeLinecap="round" />
      <Rect x={70} y={40} width={14} height={20} rx={3} fill="#3E8ED0" {...O} />
      <Path d="M32 44 L58 41 M32 56 L58 57" stroke="#3E8ED0" strokeWidth={4} strokeLinecap="round" />
    </>
  ),
  juice: () => (
    <>
      <Path d="M58 22 L64 6 L74 6" {...line(4)} />
      <Path d="M28 30 L36 18 L64 18 L72 30 Z" fill="#FFD166" {...O} />
      <Rect x={28} y={30} width={44} height={60} rx={3} fill="#F7962D" {...O} />
      <Circle cx={50} cy={60} r={13} fill="#FFD166" {...O} strokeWidth={2.5} />
      <Path d="M50 47 L50 73 M37 60 L63 60" stroke="#F7962D" strokeWidth={2.5} />
    </>
  ),
  biscuits: () => (
    <>
      <Ellipse cx={50} cy={74} rx={32} ry={10} fill="#D9A15A" {...O} />
      <Ellipse cx={50} cy={60} rx={32} ry={10} fill="#E3B26F" {...O} />
      <Ellipse cx={50} cy={46} rx={32} ry={10} fill="#E3B26F" {...O} />
      <Ellipse cx={50} cy={32} rx={32} ry={10} fill="#EDC287" {...O} />
      <Circle cx={40} cy={32} r={2.5} fill={INK} />
      <Circle cx={52} cy={29} r={2.5} fill={INK} />
      <Circle cx={60} cy={34} r={2.5} fill={INK} />
    </>
  ),
  detergent: () => (
    <>
      <Path d="M58 30 C74 30 76 54 62 54" stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" />
      <Path d="M58 30 C74 30 76 54 62 54" stroke="#8FD0C0" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d="M22 36 C22 30 26 26 32 26 L56 26 C62 26 66 30 66 36 L66 84 C66 87 64 89 61 89 L27 89 C24 89 22 87 22 84 Z" fill="#4FB39A" {...O} />
      <Rect x={30} y={14} width={20} height={12} rx={3} fill="#2E6E8E" {...O} />
      <Rect x={28} y={50} width={30} height={24} rx={4} fill="#FFFFFF" {...O} strokeWidth={2.5} />
    </>
  ),

  /* ---------------------------------- river --------------------------------- */
  'fish-orange': () => (
    <>
      <Path d={fishTail} fill="#E07A1A" {...O} />
      <Path d={fishBody} fill="#F28C28" {...O} />
      <Path d="M38 33 C43 42 43 58 38 67 L46 68 C51 58 51 42 46 32 Z" fill="#FFFFFF" {...O} strokeWidth={2.5} />
      <Path d="M58 37 C61 44 61 56 58 63 L64 60 C66 54 66 46 64 40 Z" fill="#FFFFFF" {...O} strokeWidth={2.5} />
      <Circle cx={28} cy={46} r={4.5} fill={INK} />
    </>
  ),
  puffer: () => (
    <>
      <Path d="M72 50 L88 40 L85 50 L88 60 Z" fill="#E0B640" {...O} />
      {[-70, -35, 0, 35, 70, 110, 145, 180, 215, 250].map((deg) => {
        const r = (deg * Math.PI) / 180;
        const bx = 48 + 26 * Math.cos(r);
        const by = 50 + 26 * Math.sin(r);
        const tx = 48 + 36 * Math.cos(r);
        const ty = 50 + 36 * Math.sin(r);
        const px = -Math.sin(r) * 5;
        const py = Math.cos(r) * 5;
        return (
          <Path
            key={deg}
            d={`M${bx + px} ${by + py} L${tx} ${ty} L${bx - px} ${by - py} Z`}
            fill="#E0B640"
            {...O}
            strokeWidth={2.5}
          />
        );
      })}
      <Circle cx={48} cy={50} r={27} fill="#F2CF63" {...O} />
      <Ellipse cx={50} cy={60} rx={16} ry={10} fill="#FFF3C8" />
      <Circle cx={37} cy={44} r={5} fill={INK} />
      <Circle cx={24} cy={53} r={3} fill={INK} />
    </>
  ),
  shark: () => (
    <>
      <Path d="M42 41 L50 18 L61 42 Z" fill="#7C8894" {...O} />
      <Path d="M12 54 C28 40 62 36 80 48 L92 38 L88 54 L92 70 L80 60 C62 70 30 68 12 54 Z" fill="#8F9BA8" {...O} />
      <Path d="M17 58 C32 65 56 66 73 60 C60 68 34 69 17 58 Z" fill="#E1E6EB" />
      <Path d="M17 58 L21 55 L24 60 L27 56 L30 61 L33 57" {...line(2)} />
      <Path d="M42 47 L42 57 M47 46 L47 57" {...line(2)} />
      <Circle cx={26} cy={50} r={3.5} fill={INK} />
    </>
  ),
  leaf: () => (
    <>
      <Path d={leafShape} fill="#6DBE4B" {...O} />
      <Path d="M50 22 L50 86" {...line(2.5)} />
      <Path d="M50 40 L39 32 M50 40 L61 32 M50 56 L37 48 M50 56 L63 48 M50 70 L41 64 M50 70 L59 64" {...line(2)} />
    </>
  ),
  'leaf-autumn': () => (
    <G transform="rotate(-35 50 50)">
      <Path d={leafShape} fill="#D97B34" {...O} />
      <Path d="M50 22 L50 86" {...line(2.5)} />
      <Path d="M50 40 L39 32 M50 40 L61 32 M50 56 L37 48 M50 56 L63 48 M50 70 L41 64 M50 70 L59 64" {...line(2)} />
    </G>
  ),
  drop: () => (
    <>
      <Path d="M50 12 C62 32 76 46 76 62 C76 78 64 88 50 88 C36 88 24 78 24 62 C24 46 38 32 50 12 Z" fill="#7FB3E8" {...O} />
      <Path d="M37 62 C37 70 41 76 47 78" stroke="#FFFFFF" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.85} />
    </>
  ),
  weed: () => (
    <>
      <Path d="M34 90 C26 72 42 62 32 44 C26 32 34 22 36 11 C44 24 42 34 46 46 C52 62 40 72 44 90 Z" fill="#4E9A45" {...O} />
      <Path d="M52 90 C50 76 64 66 58 50 C54 40 60 30 66 21 C70 34 66 44 68 54 C72 70 60 78 62 90 Z" fill="#6DBE4B" {...O} />
    </>
  ),
  shell: () => (
    <>
      <Path d="M50 80 L17 46 C21 22 79 22 83 46 Z" fill="#F4B7A2" {...O} />
      <Path d="M50 80 L29 32 M50 80 L42 26 M50 80 L58 26 M50 80 L71 32" {...line(2.5)} />
      <Path d="M41 80 L59 80 L55 89 L45 89 Z" fill="#E59C86" {...O} />
    </>
  ),

  /* --------------------------------- forest --------------------------------- */
  owl: () => (
    <>
      <Path d="M26 36 L29 15 L42 28 Z" fill="#8A5E3B" {...O} />
      <Path d="M74 36 L71 15 L58 28 Z" fill="#8A5E3B" {...O} />
      <Ellipse cx={50} cy={57} rx={30} ry={32} fill="#9C6C45" {...O} />
      <Ellipse cx={50} cy={67} rx={18} ry={18} fill="#E3C39B" />
      <Path d="M42 68 L46 72 L50 68 L54 72 L58 68" stroke="#9C6C45" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Circle cx={38} cy={46} r={11} fill="#FFFFFF" {...O} />
      <Circle cx={62} cy={46} r={11} fill="#FFFFFF" {...O} />
      <Circle cx={38} cy={46} r={5} fill={INK} />
      <Circle cx={62} cy={46} r={5} fill={INK} />
      <Path d="M45 55 L55 55 L50 63 Z" fill="#F2A33A" {...O} strokeWidth={2.5} />
    </>
  ),
  // A crow, not a songbird: Sound Forest plays a real crow's caw, and a blue
  // songbird beside that sound would teach the wrong pairing. Black body,
  // heavy straight beak, a white glint so the eye reads on the dark head.
  crow: () => (
    <>
      <Path d="M24 58 L6 51 L9 71 Z" fill="#2E2C33" {...O} />
      <Path d="M44 79 L41 91 M54 79 L57 91" {...line(3)} />
      <Ellipse cx={46} cy={60} rx={26} ry={19} fill="#34313A" {...O} />
      <Circle cx={64} cy={40} r={14} fill="#34313A" {...O} />
      <Path d="M27 58 C37 48 54 52 58 64 C46 70 35 68 27 58 Z" fill="#4A4652" {...O} />
      <Path d="M76 35 L94 42 L76 48 Z" fill="#6B6772" {...O} />
      <Circle cx={68} cy={37} r={4.5} fill="#FFFFFF" />
      <Circle cx={69} cy={37} r={2.2} fill={INK} />
    </>
  ),
  frog: () => (
    <>
      <Ellipse cx={50} cy={62} rx={36} ry={24} fill="#6DBE4B" {...O} />
      <Circle cx={33} cy={40} r={13} fill="#6DBE4B" {...O} />
      <Circle cx={67} cy={40} r={13} fill="#6DBE4B" {...O} />
      <Circle cx={33} cy={40} r={7} fill="#FFFFFF" />
      <Circle cx={67} cy={40} r={7} fill="#FFFFFF" />
      <Circle cx={33} cy={41} r={3.5} fill={INK} />
      <Circle cx={67} cy={41} r={3.5} fill={INK} />
      <Path d="M32 66 C42 76 58 76 68 66" {...line(3)} />
      <Circle cx={25} cy={62} r={3} fill="#F2A0A0" />
      <Circle cx={75} cy={62} r={3} fill="#F2A0A0" />
    </>
  ),
  cricket: () => (
    <>
      <Path d="M30 31 C20 15 12 12 7 14 M35 28 C31 12 24 6 17 6" {...line(2.5)} />
      <Path d="M52 64 L46 84 M44 60 L34 78 M72 58 C86 50 94 60 88 70 L76 86" {...line(3)} />
      <Ellipse cx={58} cy={57} rx={28} ry={13} fill="#7FA34A" {...O} transform="rotate(-18 58 57)" />
      <Path d="M48 50 C60 38 78 36 88 42 C76 50 62 56 50 56 Z" fill="#9CBF5E" {...O} />
      <Circle cx={34} cy={39} r={11} fill="#6B8E3C" {...O} />
      <Circle cx={31} cy={37} r={3} fill={INK} />
    </>
  ),
  duck: () => (
    <>
      <Ellipse cx={46} cy={64} rx={32} ry={20} fill="#F5EFE3" {...O} />
      <Path d="M27 60 C37 54 53 56 57 66 C47 72 33 70 27 60 Z" fill="#C9BBA2" {...O} />
      <Circle cx={67} cy={38} r={15} fill="#3F8F5A" {...O} />
      <Path d="M79 37 L94 42 L79 48 Z" fill="#F2A33A" {...O} />
      <Path d="M58 53 L75 51" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" />
      <Circle cx={70} cy={34} r={3.5} fill={INK} />
    </>
  ),
};

type Props = {
  name: ArtName;
  size: number;
  /** Degrees. Fish in Speedy Current are turned to face the way they swim. */
  rotate?: number;
};

export function Art({ name, size, rotate = 0 }: Props) {
  const draw = DRAWINGS[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {rotate ? <G transform={`rotate(${rotate} 50 50)`}>{draw()}</G> : draw()}
    </Svg>
  );
}
