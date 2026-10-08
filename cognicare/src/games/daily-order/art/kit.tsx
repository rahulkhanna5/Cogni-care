import type { ReactNode } from 'react';
import { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

/**
 * The drawing kit every Daily Order scene is built from: one person, one set
 * of props, a handful of rooms, all on a 160×120 canvas with the app's dark
 * ink outline (src/art/Art.tsx). Building every scene from the same parts is
 * what keeps 60 pictures looking like one set — the same face, the same
 * kettle, the same line weight — however many routines are added.
 *
 * Scenes show the action being done (a hand pouring, a finger pressing), so a
 * picture says which step it is without the caption.
 */

export type Pt = { x: number; y: number };

export const INK = colors.ink;
export const SW = 2; // outline width
const O = {
  stroke: INK,
  strokeWidth: SW,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
};
export const outline = O;
/** An edge for a filled shape. */
export const edge = (w = SW, color: string = INK) => ({
  stroke: color,
  strokeWidth: w,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});
/** A bare line: no fill, or an open path would fill black. */
export const stroke = (w = SW, color: string = INK) => ({
  stroke: color,
  strokeWidth: w,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

export const C = {
  skin: '#F2C9A5',
  hair: '#E4E4E4',
  blue: '#5B8DB8',
  terracotta: '#C97B62',
  green: '#6E9C78',
  plum: '#8A6FB0',
  steel: '#C3CCD2',
  steelDark: '#8E9AA2',
  white: '#FFFFFF',
  paper: '#FFFDF6',
  water: '#7DB9D4',
  tea: '#A0612F',
  milkTea: '#C99A6B',
  rice: '#FBF7EE',
  red: '#C94C4C',
  amber: '#E5A93D',
  wood: '#C9A27A',
  woodDark: '#A97F57',
  pants: '#46505A',
  note: '#7DB37A',
  flame: '#F08A3C',
  flameCore: '#FFD166',
};

/* --------------------------------- rooms ---------------------------------- */

/** Kitchen: tiled wall, worktop at y=82. */
export function Kitchen() {
  return (
    <G>
      <Rect x={0} y={0} width={160} height={82} fill="#F4ECDD" />
      {[20, 40, 60].map((y) => (
        <Line key={y} x1={0} y1={y} x2={160} y2={y} stroke="#E6DAC4" strokeWidth={1} />
      ))}
      {[20, 50, 80, 110, 140].map((x) => (
        <Line key={x} x1={x} y1={0} x2={x} y2={82} stroke="#E6DAC4" strokeWidth={1} />
      ))}
      <Rect x={0} y={82} width={160} height={38} fill="#B98D63" />
      <Rect x={0} y={80} width={160} height={6} fill="#DDBB94" />
      <Line x1={0} y1={86} x2={160} y2={86} {...stroke(1.5)} />
      <Line x1={80} y1={92} x2={80} y2={120} stroke="#A07650" strokeWidth={1.5} />
    </G>
  );
}

/** A room: plain wall, floor from y=92, optional table top at y=82. */
export function Room({ table = false, wall = '#EEF1F4' }: { table?: boolean; wall?: string }) {
  return (
    <G>
      <Rect x={0} y={0} width={160} height={92} fill={wall} />
      <Rect x={0} y={92} width={160} height={28} fill="#D8C3A5" />
      <Line x1={0} y1={92} x2={160} y2={92} stroke="#BFA785" strokeWidth={1.5} />
      {table && (
        <>
          <Rect x={0} y={80} width={160} height={8} fill={C.wood} />
          <Rect x={0} y={88} width={160} height={32} fill={C.woodDark} />
          <Line x1={0} y1={88} x2={160} y2={88} {...stroke(1.5)} />
        </>
      )}
    </G>
  );
}

/** Outdoors: sky, a far hedge, pavement from y=88. */
export function Outdoors() {
  return (
    <G>
      <Rect x={0} y={0} width={160} height={88} fill="#D6EBF5" />
      <Circle cx={138} cy={18} r={9} fill="#FFE08A" />
      <Rect x={0} y={70} width={160} height={18} fill="#A8C47A" />
      <Rect x={0} y={88} width={160} height={32} fill="#E3D6B8" />
      <Line x1={0} y1={88} x2={160} y2={88} stroke="#C8B78F" strokeWidth={1.5} />
    </G>
  );
}

/** A plain background for close-ups of hands at work. */
export function Plain({ fill = '#F4ECDD' }: { fill?: string }) {
  return <Rect x={0} y={0} width={160} height={120} fill={fill} />;
}

/* -------------------------------- people ---------------------------------- */

type PersonProps = {
  /** Waist centre: the torso stands on this point. */
  x: number;
  y: number;
  s?: number;
  shirt?: string;
  /** Where each hand is (left, right); null rests it at the side. */
  hands?: [Pt | null, Pt | null];
  /** Which way the face turns. */
  look?: 'left' | 'right' | 'front';
  legs?: 'stand' | 'walk' | 'sit' | null;
  glasses?: boolean;
  mouth?: 'smile' | 'open' | 'drink';
  /** Drawn between the body and the arms, so hands sit on what they hold. */
  children?: ReactNode;
};

/** The player's stand-in: an older adult with grey hair. */
export function Person({
  x,
  y,
  s = 1,
  shirt = C.blue,
  hands = [null, null],
  look = 'front',
  legs = null,
  glasses = false,
  mouth = 'smile',
  children,
}: PersonProps) {
  const p = (dx: number, dy: number) => ({ x: x + dx * s, y: y + dy * s });
  const shoulderL = p(-12, -27);
  const shoulderR = p(12, -27);
  const rest: [Pt, Pt] = [p(-16, -2), p(16, -2)];
  const head = p(0, -46);
  const r = 11 * s;
  const eye = look === 'left' ? -2.5 : look === 'right' ? 2.5 : 0;

  return (
    <G>
      {legs && <Legs x={x} y={y} s={s} kind={legs} />}
      <Path
        d={`M${p(-14, 0).x} ${p(-14, 0).y} L${p(-14, -24).x} ${p(-14, -24).y} Q${p(-13, -32).x} ${p(-13, -32).y} ${p(0, -32).x} ${p(0, -32).y} Q${p(13, -32).x} ${p(13, -32).y} ${p(14, -24).x} ${p(14, -24).y} L${p(14, 0).x} ${p(14, 0).y} Z`}
        fill={shirt}
        {...O}
      />
      <Rect x={p(-3, -37).x} y={p(-3, -37).y} width={6 * s} height={6 * s} fill={C.skin} />
      <Circle cx={head.x} cy={head.y} r={r} fill={C.skin} {...O} />
      <Path
        d={`M${head.x - r - 0.5} ${head.y + 1} C${head.x - r - 1} ${head.y - r - 4} ${head.x + r + 1} ${head.y - r - 4} ${head.x + r + 0.5} ${head.y + 1} C${head.x + r * 0.6} ${head.y - r * 0.55} ${head.x - r * 0.6} ${head.y - r * 0.55} ${head.x - r - 0.5} ${head.y + 1} Z`}
        fill={C.hair}
        {...O}
      />
      <Circle cx={head.x - 4 * s + eye} cy={head.y + 1 * s} r={1.4 * s} fill={INK} />
      <Circle cx={head.x + 4 * s + eye} cy={head.y + 1 * s} r={1.4 * s} fill={INK} />
      {glasses && (
        <G {...stroke(1.2)}>
          <Circle cx={head.x - 4 * s + eye} cy={head.y + 1 * s} r={3.2 * s} />
          <Circle cx={head.x + 4 * s + eye} cy={head.y + 1 * s} r={3.2 * s} />
        </G>
      )}
      {mouth === 'smile' && (
        <Path
          d={`M${head.x - 3 * s + eye} ${head.y + 5.5 * s} Q${head.x + eye} ${head.y + 8 * s} ${head.x + 3 * s + eye} ${head.y + 5.5 * s}`}
          {...stroke(1.3)}
        />
      )}
      {mouth === 'open' && <Ellipse cx={head.x + eye} cy={head.y + 6.5 * s} rx={2.2 * s} ry={1.6 * s} fill={INK} />}
      {children}
      <Arm from={shoulderL} to={hands[0] ?? rest[0]} sleeve={shirt} s={s} />
      <Arm from={shoulderR} to={hands[1] ?? rest[1]} sleeve={shirt} s={s} />
    </G>
  );
}

function Legs({ x, y, s, kind }: { x: number; y: number; s: number; kind: 'stand' | 'walk' | 'sit' }) {
  const p = (dx: number, dy: number) => `${x + dx * s} ${y + dy * s}`;
  const leg = (d: string) => <Path d={d} {...stroke(8 * s, C.pants)} />;
  const shoe = (dx: number, dy: number) => (
    <Ellipse cx={x + dx * s} cy={y + dy * s} rx={5 * s} ry={2.6 * s} fill={INK} />
  );
  if (kind === 'sit')
    return (
      <G>
        {leg(`M${p(-6, -2)} L${p(-6, 14)} L${p(-6, 30)}`)}
        {leg(`M${p(6, -2)} L${p(10, 14)} L${p(10, 30)}`)}
        {shoe(-4, 32)}
        {shoe(12, 32)}
      </G>
    );
  if (kind === 'walk')
    return (
      <G>
        {leg(`M${p(-5, -2)} L${p(-12, 30)}`)}
        {leg(`M${p(5, -2)} L${p(12, 30)}`)}
        {shoe(-13, 32)}
        {shoe(14, 32)}
      </G>
    );
  return (
    <G>
      {leg(`M${p(-6, -2)} L${p(-6, 30)}`)}
      {leg(`M${p(6, -2)} L${p(6, 30)}`)}
      {shoe(-7, 32)}
      {shoe(7, 32)}
    </G>
  );
}

/** Shoulder to hand, bending at an elbow below the straight line. */
function Arm({ from, to, sleeve, s }: { from: Pt; to: Pt; sleeve: string; s: number }) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2 + 7 * s;
  return (
    <G>
      <Path d={`M${from.x} ${from.y} Q${mx} ${my} ${to.x} ${to.y}`} {...stroke(9 * s, INK)} />
      <Path d={`M${from.x} ${from.y} Q${mx} ${my} ${to.x} ${to.y}`} {...stroke(6 * s, sleeve)} />
      <Circle cx={to.x} cy={to.y} r={4.2 * s} fill={C.skin} {...O} />
    </G>
  );
}

/**
 * A forearm reaching in from off-picture, for close-ups. `point` adds a finger
 * in the direction of reach; `pinch` a thumb and finger.
 */
export function Reach({
  from,
  to,
  sleeve = C.blue,
  pose = 'hold',
}: {
  from: Pt;
  to: Pt;
  sleeve?: string;
  pose?: 'hold' | 'point' | 'pinch';
}) {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  const ux = (to.x - from.x) / len;
  const uy = (to.y - from.y) / len;
  const wrist = { x: to.x - ux * 7, y: to.y - uy * 7 };
  return (
    <G>
      <Line x1={from.x} y1={from.y} x2={wrist.x} y2={wrist.y} {...stroke(14, INK)} />
      <Line x1={from.x} y1={from.y} x2={wrist.x} y2={wrist.y} {...stroke(11, sleeve)} />
      {pose === 'point' && (
        <>
          <Line x1={to.x} y1={to.y} x2={to.x + ux * 9} y2={to.y + uy * 9} {...stroke(6.5, INK)} />
          <Line x1={to.x} y1={to.y} x2={to.x + ux * 9} y2={to.y + uy * 9} {...stroke(3.8, C.skin)} />
        </>
      )}
      {pose === 'pinch' && (
        <>
          <Line x1={to.x} y1={to.y} x2={to.x + ux * 7 - uy * 3} y2={to.y + uy * 7 + ux * 3} {...stroke(6, INK)} />
          <Line x1={to.x} y1={to.y} x2={to.x + ux * 7 - uy * 3} y2={to.y + uy * 7 + ux * 3} {...stroke(3.4, C.skin)} />
        </>
      )}
      <Circle cx={to.x} cy={to.y} r={7} fill={C.skin} {...O} />
    </G>
  );
}

/** Little strokes beside something that is moving or happening. */
export function Motion({ x, y, dir = 'right', n = 3 }: Pt & { dir?: 'right' | 'left' | 'up' | 'down'; n?: number }) {
  const d = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }[dir];
  return (
    <G {...stroke(1.6)}>
      {Array.from({ length: n }, (_, i) => {
        const off = (i - (n - 1) / 2) * 5;
        const sx = x + d[1] * off;
        const sy = y + d[0] * off;
        return <Line key={i} x1={sx} y1={sy} x2={sx + d[0] * 7} y2={sy + d[1] * 7} />;
      })}
    </G>
  );
}

export function Steam({ x, y, n = 3 }: Pt & { n?: number }) {
  return (
    <G {...stroke(1.6, '#9AA6AE')}>
      {Array.from({ length: n }, (_, i) => {
        const sx = x + (i - (n - 1) / 2) * 6;
        return <Path key={i} d={`M${sx} ${y} q-3 -5 0 -9 q3 -4 0 -9`} />;
      })}
    </G>
  );
}

/** A falling or pouring stream from a to b, outlined like everything else. */
export function Stream({ a, b, color = C.water, w = 4 }: { a: Pt; b: Pt; color?: string; w?: number }) {
  const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.15;
  const my = Math.min(a.y, b.y) + Math.abs(b.y - a.y) * 0.3;
  const d = `M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`;
  return (
    <G>
      <Path d={d} {...stroke(w + 2.4)} />
      <Path d={d} {...stroke(w, color)} />
    </G>
  );
}

/** Draws its children at a scale, with (0,0) moved to x,y. */
export function Scaled({ x, y, s, children }: Pt & { s: number; children: ReactNode }) {
  return <G transform={`translate(${x} ${y}) scale(${s})`}>{children}</G>;
}

export function Drops({ x, y, color = C.water }: Pt & { color?: string }) {
  return (
    <G>
      {[
        [0, 0],
        [5, 7],
        [-3, 12],
      ].map(([dx, dy]) => (
        <Path key={`${dx}${dy}`} d={`M${x + dx} ${y + dy} q2.2 3.2 0 4.4 q-2.2 -1.2 0 -4.4 Z`} fill={color} />
      ))}
    </G>
  );
}

/** A speech bubble with three dots — someone is speaking. */
export function Speech({ x, y, flip = false }: Pt & { flip?: boolean }) {
  const t = flip ? -1 : 1;
  return (
    <G>
      <Path
        d={`M${x - 14} ${y - 10} h28 a4 4 0 0 1 4 4 v8 a4 4 0 0 1 -4 4 h-${flip ? 4 : 18} l${-6 * t} 6 l${flip ? -1 : 1} -6 h-${flip ? 18 : 4} a4 4 0 0 1 -4 -4 v-8 a4 4 0 0 1 4 -4 Z`}
        fill={C.white}
        {...O}
      />
      {[-7, 0, 7].map((dx) => (
        <Circle key={dx} cx={x + dx} cy={y - 2} r={1.8} fill={INK} />
      ))}
    </G>
  );
}

/* --------------------------------- props ---------------------------------- */

/** Bottom-centre anchored unless noted. `tilt` rotates about that point. */
type At = Pt & { s?: number; tilt?: number; flip?: boolean };
const place = ({ x, y, s = 1, tilt = 0, flip = false }: At) =>
  `translate(${x} ${y}) rotate(${tilt}) scale(${flip ? -s : s} ${s})`;

export function Kettle({ onBase = false, light = false, ...at }: At & { onBase?: boolean; light?: boolean }) {
  return (
    <G transform={place(at)}>
      {onBase && (
        <>
          <Rect x={-17} y={-1} width={34} height={5} rx={2} fill={C.steelDark} {...O} />
          <Circle cx={10} cy={1.5} r={1.6} fill={light ? '#FF5A4E' : '#5A646B'} />
        </>
      )}
      <Path d="M-12 -20 C-26 -22 -26 -5 -13 -5" {...stroke(3.4)} />
      <Path d="M11 -9 L24 -25 L20 -27 L10 -17 Z" fill={C.steel} {...O} />
      <Path d="M-14 0 L-11 -24 Q0 -29 11 -24 L14 0 Z" fill={C.steel} {...O} />
      <Ellipse cx={0} cy={-25} rx={9} ry={2.6} fill={C.steelDark} {...O} />
      <Circle cx={0} cy={-29} r={2.6} fill={INK} />
      {light && <Rect x={-4} y={-14} width={8} height={4} rx={1} fill="#FF5A4E" />}
    </G>
  );
}

export function Cup({ fill = 'empty', ...at }: At & { fill?: 'empty' | 'tea' | 'milky' | 'water' }) {
  const top = {
    empty: '#E9E2D6',
    tea: C.tea,
    milky: C.milkTea,
    water: C.water,
  }[fill];
  return (
    <G transform={place(at)}>
      <Path d="M9 -14 C17 -14 17 -4 9 -4" {...stroke(3)} />
      <Path d="M-10 -18 L-9 -2 Q-9 0 -7 0 L7 0 Q9 0 9 -2 L10 -18 Z" fill={C.white} {...O} />
      <Ellipse cx={0} cy={-18} rx={10} ry={3} fill={top} {...O} />
    </G>
  );
}

export function Glass({ level = 0.7, ...at }: At & { level?: number }) {
  const h = 22;
  const wy = -h * level;
  return (
    <G transform={place(at)}>
      {level > 0 && <Path d={`M-7.6 ${wy} L-7 -1 L7 -1 L7.6 ${wy} Z`} fill={C.water} />}
      <Path d={`M-8 -${h} L-7 0 L7 0 L8 -${h}`} fill="none" {...O} />
      <Ellipse cx={0} cy={-h} rx={8} ry={2} fill="none" {...O} />
    </G>
  );
}

export function Jug({ fill = C.white, ...at }: At & { fill?: string }) {
  return (
    <G transform={place(at)}>
      <Path d="M-10 -20 C-20 -20 -20 -6 -10 -6" {...stroke(3)} />
      <Path d="M-10 0 L-11 -22 L8 -22 L14 -27 L12 -20 L10 0 Z" fill={fill} {...O} />
    </G>
  );
}

export function TeaBag({ x, y }: Pt) {
  return (
    <G>
      <Line x1={x} y1={y} x2={x} y2={y + 14} {...stroke(1.2)} />
      <Rect x={x - 5} y={y - 6} width={10} height={7} rx={1} fill={C.amber} {...O} />
      <Rect x={x - 6} y={y + 14} width={12} height={12} rx={2} fill="#E9D5B0" {...O} />
    </G>
  );
}

/** A wall tap with a sink below, its spout at (x, y). */
export function Tap({ x, y, running = false }: Pt & { running?: boolean }) {
  return (
    <G>
      <Path d={`M${x + 20} ${y - 14} L${x + 20} ${y - 8} L${x} ${y - 8} L${x} ${y}`} {...stroke(7, INK)} />
      <Path d={`M${x + 20} ${y - 14} L${x + 20} ${y - 8} L${x} ${y - 8} L${x} ${y}`} {...stroke(4, C.steel)} />
      <Rect x={x + 15} y={y - 20} width={10} height={4} rx={1.5} fill={C.steelDark} {...O} />
      {running && <Line x1={x} y1={y + 2} x2={x} y2={y + 40} {...stroke(3.5, C.water)} />}
    </G>
  );
}

export function SugarBowl({ x, y }: Pt) {
  return (
    <G>
      <Line x1={x + 2} y1={y - 12} x2={x + 10} y2={y - 22} {...stroke(2.4)} />
      <Path
        d={`M${x - 11} ${y - 12} Q${x - 10} ${y} ${x} ${y} Q${x + 10} ${y} ${x + 11} ${y - 12} Z`}
        fill={C.white}
        {...O}
      />
      <Ellipse cx={x} cy={y - 12} rx={11} ry={3} fill={C.white} {...O} />
      <Circle cx={x - 3} cy={y - 13} r={1.2} fill="#D8CFC0" />
      <Circle cx={x + 2} cy={y - 12} r={1.2} fill="#D8CFC0" />
    </G>
  );
}

export function PillBottle({ open = false, ...at }: At & { open?: boolean }) {
  return (
    <G transform={place(at)}>
      <Rect x={-9} y={-24} width={18} height={24} rx={3} fill={C.amber} {...O} />
      <Rect x={-9} y={-18} width={18} height={11} fill={C.white} {...O} />
      <Line x1={-5} y1={-14} x2={5} y2={-14} {...stroke(1.3)} />
      <Line x1={-5} y1={-10.5} x2={2} y2={-10.5} {...stroke(1.3)} />
      {!open && <Rect x={-10} y={-30} width={20} height={6} rx={2} fill={C.white} {...O} />}
    </G>
  );
}

export function Tablets({ x, y, n = 2 }: Pt & { n?: number }) {
  return (
    <G>
      {Array.from({ length: n }, (_, i) => (
        <Ellipse
          key={i}
          cx={x + (i - (n - 1) / 2) * 7}
          cy={y + (i % 2) * 2}
          rx={3.2}
          ry={2.2}
          fill={C.white}
          {...edge(1.3)}
        />
      ))}
    </G>
  );
}

/** A sheet of paper. `lines` rows of writing; `ticks` of them checked; `heading` bar. */
export function Paper({
  x,
  y,
  w = 34,
  h = 44,
  lines = 4,
  ticks = 0,
  boxes = false,
  heading,
  fill = C.paper,
  tilt = 0,
}: Pt & {
  w?: number;
  h?: number;
  lines?: number;
  ticks?: number;
  boxes?: boolean;
  heading?: string;
  fill?: string;
  tilt?: number;
}) {
  return (
    <G transform={`rotate(${tilt} ${x + w / 2} ${y + h / 2})`}>
      <Rect x={x} y={y} width={w} height={h} rx={2} fill={fill} {...O} />
      {heading && <Rect x={x} y={y} width={w} height={7} rx={2} fill={heading} {...O} />}
      {Array.from({ length: lines }, (_, i) => {
        const ly = y + (heading ? 13 : 8) + i * ((h - (heading ? 17 : 12)) / Math.max(lines - 1, 1));
        const bx = boxes ? x + 5 : x;
        return (
          <G key={i}>
            {boxes && <Rect x={bx - 1} y={ly - 3} width={6} height={6} fill={C.white} {...edge(1.2)} />}
            {boxes && i < ticks && <Path d={`M${bx} ${ly} l2 2 l4 -5`} {...stroke(1.6, C.green)} />}
            <Line x1={x + (boxes ? 13 : 5)} y1={ly} x2={x + w - 5 - (i % 2) * 6} y2={ly} {...stroke(1.3, '#9AA6AE')} />
          </G>
        );
      })}
    </G>
  );
}

export function Pen({ x, y, tilt = 35 }: Pt & { tilt?: number }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${tilt})`}>
      <Rect x={-2.2} y={-26} width={4.4} height={22} rx={1.5} fill={C.blue} {...O} />
      <Path d="M-2.2 -4 L0 1 L2.2 -4 Z" fill={INK} />
    </G>
  );
}

/** Envelope, `x,y` top-left, 40×26. */
export function Envelope({
  x,
  y,
  address = false,
  stamp = false,
  open = false,
  torn = false,
  tilt = 0,
}: Pt & { address?: boolean; stamp?: boolean; open?: boolean; torn?: boolean; tilt?: number }) {
  return (
    <G transform={`rotate(${tilt} ${x + 20} ${y + 13})`}>
      {torn && (
        // Ripped along the top: a jagged edge instead of a flap.
        <Path d={`M${x} ${y + 4} l5 -4 l5 4 l5 -4 l5 4 l5 -4 l5 4 l5 -4 l5 4`} {...stroke(1.6)} />
      )}
      {open && <Path d={`M${x} ${y} L${x + 20} ${y - 14} L${x + 40} ${y} Z`} fill="#EFE3C9" {...O} />}
      <Rect x={x} y={y} width={40} height={26} rx={2} fill="#F7EEDB" {...O} />
      {!open && !torn && <Path d={`M${x} ${y} L${x + 20} ${y + 13} L${x + 40} ${y}`} {...stroke(1.4)} />}
      {address && (
        <G {...stroke(1.4, '#5E6B76')}>
          <Line x1={x + 12} y1={y + 15} x2={x + 30} y2={y + 15} />
          <Line x1={x + 12} y1={y + 19} x2={x + 27} y2={y + 19} />
        </G>
      )}
      {stamp && <Stamp x={x + 31} y={y + 3} />}
    </G>
  );
}

export function Stamp({ x, y }: Pt) {
  return (
    <G>
      <Rect x={x} y={y} width={7} height={8} fill={C.red} stroke={C.white} strokeWidth={1.2} strokeDasharray="1.4 1" />
      <Circle cx={x + 3.5} cy={y + 4} r={1.6} fill={C.white} />
    </G>
  );
}

/** A red pillar post box, `x,y` bottom centre. */
export function PostBox({ x, y }: Pt) {
  return (
    <G>
      <Rect x={x - 13} y={y - 54} width={26} height={54} rx={3} fill={C.red} {...O} />
      <Path d={`M${x - 15} ${y - 52} Q${x} ${y - 66} ${x + 15} ${y - 52} Z`} fill={C.red} {...O} />
      <Rect x={x - 9} y={y - 42} width={18} height={4} rx={1} fill={INK} />
      <Rect x={x - 7} y={y - 30} width={14} height={9} rx={1} fill={C.white} {...edge(1.2)} />
      <Rect x={x - 15} y={y - 4} width={30} height={4} fill="#8E2F2F" {...O} />
    </G>
  );
}

/** A bill, `x,y` top-left, 36×46, with the amount boxed. */
export function Bill({ x, y, tilt = 0, scrunched = false }: Pt & { tilt?: number; scrunched?: boolean }) {
  if (scrunched)
    return (
      <G>
        <Path
          d={`M${x + 4} ${y + 6} L${x + 14} ${y} L${x + 24} ${y + 4} L${x + 30} ${y + 14} L${x + 24} ${y + 24} L${x + 10} ${y + 26} L${x + 2} ${y + 18} Z`}
          fill={C.paper}
          {...O}
        />
        <Path
          d={`M${x + 9} ${y + 9} L${x + 16} ${y + 15} L${x + 23} ${y + 10} M${x + 12} ${y + 20} L${x + 19} ${y + 17}`}
          {...stroke(1.2, '#9AA6AE')}
        />
      </G>
    );
  return (
    <G transform={`rotate(${tilt} ${x + 18} ${y + 23})`}>
      <Rect x={x} y={y} width={36} height={46} rx={2} fill={C.paper} {...O} />
      <Rect x={x} y={y} width={36} height={8} rx={2} fill={C.amber} {...O} />
      <Path d={`M${x + 18} ${y + 10} l-3 5 h3 l-2 5 l6 -7 h-3 l2 -3 Z`} fill={C.amber} {...edge(1)} />
      <Line x1={x + 5} y1={y + 25} x2={x + 31} y2={y + 25} {...stroke(1.2, '#9AA6AE')} />
      <Line x1={x + 5} y1={y + 29} x2={x + 24} y2={y + 29} {...stroke(1.2, '#9AA6AE')} />
      <Rect x={x + 16} y={y + 34} width={16} height={8} rx={1.5} fill="#FFF1C9" {...edge(1.4)} />
      <Line x1={x + 19} y1={y + 38} x2={x + 29} y2={y + 38} {...stroke(1.6)} />
    </G>
  );
}

/** Wall calendar, `x,y` top-left, 40×40. `mark` rings one day; `next` adds an arrow to the day after. */
export function Calendar({ x, y, mark = 8, next = false }: Pt & { mark?: number; next?: boolean }) {
  const cell = (i: number) => ({
    cx: x + 6 + (i % 5) * 7,
    cy: y + 16 + Math.floor(i / 5) * 7,
  });
  const m = cell(mark);
  const n = cell(mark + 1);
  return (
    <G>
      <Rect x={x} y={y} width={40} height={40} rx={3} fill={C.white} {...O} />
      <Rect x={x} y={y} width={40} height={9} rx={3} fill={C.red} {...O} />
      <Circle cx={x + 10} cy={y} r={2} fill={INK} />
      <Circle cx={x + 30} cy={y} r={2} fill={INK} />
      {Array.from({ length: 20 }, (_, i) => (
        <Rect key={i} x={cell(i).cx - 2} y={cell(i).cy - 2} width={4} height={4} fill="#C9D1D7" />
      ))}
      <Circle cx={m.cx} cy={m.cy} r={4.6} fill="none" {...edge(1.8, C.red)} />
      {next && (
        <Path d={`M${m.cx + 3} ${m.cy - 6} Q${(m.cx + n.cx) / 2} ${m.cy - 11} ${n.cx} ${n.cy - 5}`} {...stroke(1.6)} />
      )}
      {next && <Rect x={n.cx - 3} y={n.cy - 3} width={6} height={6} fill={C.amber} {...edge(1.2)} />}
    </G>
  );
}

export function Clock({ x, y, r = 12, h = 10, m = 0 }: Pt & { r?: number; h?: number; m?: number }) {
  const ha = ((h % 12) / 12 + m / 720) * 2 * Math.PI;
  const ma = (m / 60) * 2 * Math.PI;
  return (
    <G>
      <Circle cx={x} cy={y} r={r} fill={C.white} {...O} />
      <Line x1={x} y1={y} x2={x + Math.sin(ha) * r * 0.5} y2={y - Math.cos(ha) * r * 0.5} {...stroke(2)} />
      <Line x1={x} y1={y} x2={x + Math.sin(ma) * r * 0.78} y2={y - Math.cos(ma) * r * 0.78} {...stroke(1.4)} />
      <Circle cx={x} cy={y} r={1.4} fill={INK} />
    </G>
  );
}

/** A phone, `x,y` top-left, 26×46. */
export function Phone({ x, y, screen }: Pt & { screen: 'bank' | 'pay' | 'twice' }) {
  return (
    <G>
      <Rect x={x} y={y} width={26} height={46} rx={4} fill="#2F3A44" {...O} />
      <Rect x={x + 3} y={y + 5} width={20} height={34} rx={1.5} fill={C.white} />
      {screen === 'bank' && (
        <G>
          <Path d={`M${x + 6} ${y + 17} L${x + 13} ${y + 11} L${x + 20} ${y + 17} Z`} fill={C.blue} />
          {[8, 12, 16].map((dx) => (
            <Rect key={dx} x={x + dx - 0.8} y={y + 18} width={1.6} height={8} fill={C.blue} />
          ))}
          <Rect x={x + 6} y={y + 27} width={14} height={2} fill={C.blue} />
        </G>
      )}
      {(screen === 'pay' || screen === 'twice') && (
        <G>
          <Line x1={x + 6} y1={y + 12} x2={x + 20} y2={y + 12} {...stroke(1.6, '#9AA6AE')} />
          <Line x1={x + 6} y1={y + 17} x2={x + 16} y2={y + 17} {...stroke(1.6, '#9AA6AE')} />
          <Rect x={x + 5} y={y + 26} width={16} height={8} rx={4} fill={C.green} />
        </G>
      )}
      {screen === 'twice' && (
        <G>
          <Rect x={x + 5} y={y + 26} width={16} height={8} rx={4} fill={C.green} />
          <Circle cx={x + 24} cy={y + 4} r={6} fill={C.amber} {...O} />
          <Path
            d={`M${x + 21.5} ${y + 2} l2 2 m0 -2 l-2 2 M${x + 25} ${y + 1.5} q2 0 1 2.5 l-1.5 1.5 h2.5`}
            {...stroke(1)}
          />
        </G>
      )}
    </G>
  );
}

export function Cash({ x, y, tilt = 0 }: Pt & { tilt?: number }) {
  return (
    <G transform={`rotate(${tilt} ${x + 16} ${y + 8})`}>
      <Rect x={x + 3} y={y - 3} width={32} height={16} rx={2} fill="#9CC79A" {...O} />
      <Rect x={x} y={y} width={32} height={16} rx={2} fill={C.note} {...O} />
      <Circle cx={x + 16} cy={y + 8} r={4} fill="#B9DDB6" {...edge(1.2)} />
    </G>
  );
}

/** A till receipt, `x,y` top-left, 22×32, zig-zag foot. */
export function Receipt({ x, y, tilt = 0 }: Pt & { tilt?: number }) {
  const zig = Array.from({ length: 6 }, (_, i) => `L${x + 22 - (i + 0.5) * (22 / 6)} ${y + 32 + (i % 2 ? 0 : 3)}`).join(
    ' '
  );
  return (
    <G transform={`rotate(${tilt} ${x + 11} ${y + 16})`}>
      <Path d={`M${x} ${y} L${x + 22} ${y} L${x + 22} ${y + 32} ${zig} L${x} ${y + 32} Z`} fill={C.white} {...O} />
      {[7, 12, 17, 24].map((dy) => (
        <Line key={dy} x1={x + 4} y1={y + dy} x2={x + (dy === 24 ? 18 : 15)} y2={y + dy} {...stroke(1.2, '#9AA6AE')} />
      ))}
    </G>
  );
}

export function Folder({ x, y }: Pt) {
  return (
    <G>
      <Path d={`M${x} ${y} h14 l4 5 h22 v30 h-40 Z`} fill="#E8C46A" {...O} />
      <Rect x={x} y={y + 9} width={40} height={26} fill="#F2D27E" {...O} />
    </G>
  );
}

export function Bin({ x, y }: Pt) {
  return (
    <G>
      <Path d={`M${x - 16} ${y - 34} L${x - 12} ${y} L${x + 12} ${y} L${x + 16} ${y - 34} Z`} fill="#8E9AA2" {...O} />
      {[-7, 0, 7].map((dx) => (
        <Line key={dx} x1={x + dx} y1={y - 28} x2={x + dx * 0.85} y2={y - 6} {...stroke(1.4, '#6D7880')} />
      ))}
      <Rect x={x - 18} y={y - 38} width={36} height={5} rx={2} fill="#A9B3BA" {...O} />
    </G>
  );
}

export function Bag({ x, y, full = false, color = C.green }: Pt & { full?: boolean; color?: string }) {
  return (
    <G>
      {full && (
        <G>
          <Rect x={x - 9} y={y - 32} width={6} height={12} fill="#E3A65F" {...edge(1.2)} />
          <Circle cx={x + 5} cy={y - 26} r={5} fill={C.red} {...edge(1.2)} />
          <Path d={`M${x - 2} ${y - 22} q2 -12 6 -14`} {...stroke(2.4, '#5E9A4B')} />
        </G>
      )}
      <Path
        d={`M${x - 7} ${y - 24} Q${x - 7} ${y - 36} ${x} ${y - 36} Q${x + 7} ${y - 36} ${x + 7} ${y - 24}`}
        {...stroke(2.4)}
      />
      <Path d={`M${x - 13} ${y - 24} L${x - 11} ${y} L${x + 11} ${y} L${x + 13} ${y - 24} Z`} fill={color} {...O} />
    </G>
  );
}

export function Purse({ x, y }: Pt) {
  return (
    <G>
      <Path d={`M${x - 6} ${y - 12} Q${x} ${y - 20} ${x + 6} ${y - 12}`} {...stroke(2)} />
      <Rect x={x - 11} y={y - 13} width={22} height={13} rx={3} fill={C.plum} {...O} />
      <Circle cx={x} cy={y - 9} r={1.8} fill={C.amber} />
    </G>
  );
}

/** A shopping basket, `x,y` bottom centre; `items` peep over the rim. */
export function Basket({ x, y, items = true }: Pt & { items?: boolean }) {
  return (
    <G>
      {items && (
        <G>
          <Rect x={x - 12} y={y - 24} width={8} height={12} rx={1} fill="#DCE7F2" {...edge(1.2)} />
          <Circle cx={x + 3} cy={y - 16} r={5} fill={C.red} {...edge(1.2)} />
          <Rect x={x + 8} y={y - 22} width={6} height={10} fill="#E3A65F" {...edge(1.2)} />
        </G>
      )}
      <Path d={`M${x - 12} ${y - 14} Q${x} ${y - 30} ${x + 12} ${y - 14}`} {...stroke(2.2)} />
      <Path d={`M${x - 17} ${y - 14} L${x - 13} ${y} L${x + 13} ${y} L${x + 17} ${y - 14} Z`} fill={C.red} {...O} />
      <Line x1={x - 15} y1={y - 8} x2={x + 15} y2={y - 8} {...stroke(1.2)} />
    </G>
  );
}

/** Shop shelves across the back wall, stocked. */
export function Shelves() {
  const goods = ['#E3A65F', '#5B8FD6', '#C94C4C', '#6E9C78', '#E5A93D', '#DCE7F2', '#8A6FB0'];
  return (
    <G>
      <Rect x={0} y={0} width={160} height={92} fill="#F3EEE4" />
      {[30, 62].map((sy) => (
        <G key={sy}>
          {Array.from({ length: 11 }, (_, i) => (
            <Rect
              key={i}
              x={6 + i * 14}
              y={sy - 16 + (i % 3) * 2}
              width={10}
              height={16 - (i % 3) * 2}
              rx={1.5}
              fill={goods[(i + sy) % goods.length]}
              {...edge(1.2)}
            />
          ))}
          <Rect x={0} y={sy} width={160} height={5} fill={C.wood} {...O} />
        </G>
      ))}
      <Rect x={0} y={92} width={160} height={28} fill="#D9D3C7" />
    </G>
  );
}

/** A shop front, `x,y` bottom-left, 56 wide. */
export function ShopFront({ x, y }: Pt) {
  return (
    <G>
      <Rect x={x} y={y - 56} width={56} height={56} fill="#F1E3C8" {...O} />
      {Array.from({ length: 7 }, (_, i) => (
        <Path key={i} d={`M${x + i * 8} ${y - 44} h8 v6 q-4 4 -8 0 Z`} fill={i % 2 ? C.white : C.red} {...edge(1.2)} />
      ))}
      <Rect x={x} y={y - 50} width={56} height={6} fill={C.red} {...O} />
      <Rect x={x + 5} y={y - 32} width={22} height={18} fill="#BFDCEB" {...O} />
      <Rect x={x + 33} y={y - 34} width={16} height={34} fill={C.woodDark} {...O} />
    </G>
  );
}

/** A small house, `x,y` bottom-left, 50 wide. */
export function House({ x, y }: Pt) {
  return (
    <G>
      <Rect x={x} y={y - 36} width={50} height={36} fill="#EFD0B4" {...O} />
      <Path d={`M${x - 5} ${y - 34} L${x + 25} ${y - 58} L${x + 55} ${y - 34} Z`} fill={C.terracotta} {...O} />
      <Rect x={x + 20} y={y - 20} width={11} height={20} fill={C.woodDark} {...O} />
      <Rect x={x + 6} y={y - 28} width={9} height={9} fill="#BFDCEB" {...O} />
      <Rect x={x + 36} y={y - 28} width={9} height={9} fill="#BFDCEB" {...O} />
    </G>
  );
}

/** A door in a wall, `x,y` bottom-left, 30×56. */
export function Door({ x, y, open = false }: Pt & { open?: boolean }) {
  return (
    <G>
      <Rect x={x} y={y - 56} width={30} height={56} fill={open ? '#CFE6F2' : C.woodDark} {...O} />
      {open && (
        <Path d={`M${x} ${y - 56} L${x - 12} ${y - 50} L${x - 12} ${y + 4} L${x} ${y} Z`} fill={C.woodDark} {...O} />
      )}
      {!open && <Circle cx={x + 24} cy={y - 28} r={2} fill={C.amber} />}
    </G>
  );
}

/** A counter top across the picture at y, with a front panel below. */
export function Counter({ y, color = '#C9B79A' }: { y: number; color?: string }) {
  return (
    <G>
      <Rect x={0} y={y} width={160} height={120 - y} fill={color} />
      <Rect x={0} y={y - 4} width={160} height={6} fill="#E2D3B8" {...O} />
    </G>
  );
}

export function Till({ x, y }: Pt) {
  return (
    <G>
      <Rect x={x - 16} y={y - 14} width={32} height={14} rx={2} fill="#5E6B76" {...O} />
      <Rect x={x - 10} y={y - 30} width={20} height={14} rx={2} fill="#2F3A44" {...O} />
      <Rect x={x - 7} y={y - 27} width={14} height={6} fill="#9FE0B5" />
    </G>
  );
}

/** Rice: a sack, `x,y` bottom centre. */
export function RiceSack({ x, y }: Pt) {
  return (
    <G>
      <Path
        d={`M${x - 16} ${y} L${x - 14} ${y - 30} Q${x} ${y - 36} ${x + 14} ${y - 30} L${x + 16} ${y} Z`}
        fill="#E9D9B4"
        {...O}
      />
      <Ellipse cx={x} cy={y - 31} rx={13} ry={4} fill={C.rice} {...O} />
      <Path d={`M${x - 6} ${y - 14} q6 -6 12 0 q-6 6 -12 0 Z`} fill="#B9A06A" />
    </G>
  );
}

/** A measuring cup, `x,y` bottom centre, holding rice. */
export function Scoop({ full = true, ...at }: At & { full?: boolean }) {
  return (
    <G transform={place(at)}>
      <Line x1={10} y1={-9} x2={24} y2={-14} {...stroke(4, INK)} />
      <Line x1={10} y1={-9} x2={24} y2={-14} {...stroke(2, C.steel)} />
      <Path d="M-10 -16 L-8 0 L8 0 L10 -16 Z" fill={C.steel} {...O} />
      {full && <Ellipse cx={0} cy={-16} rx={10} ry={3.4} fill={C.rice} {...O} />}
    </G>
  );
}

export function Grains({ x, y, n = 8, spread = 10 }: Pt & { n?: number; spread?: number }) {
  return (
    <G>
      {Array.from({ length: n }, (_, i) => (
        <Ellipse
          key={i}
          cx={x + ((i * 37) % (spread * 2)) - spread}
          cy={y + ((i * 23) % spread)}
          rx={1.6}
          ry={1}
          fill={C.rice}
          stroke={INK}
          strokeWidth={0.6}
        />
      ))}
    </G>
  );
}

/** A bowl, `x,y` bottom centre. */
export function Bowl({ x, y, rice = true, water = false }: Pt & { rice?: boolean; water?: boolean }) {
  return (
    <G>
      <Path
        d={`M${x - 18} ${y - 14} Q${x - 16} ${y} ${x} ${y} Q${x + 16} ${y} ${x + 18} ${y - 14} Z`}
        fill={C.white}
        {...O}
      />
      <Ellipse cx={x} cy={y - 14} rx={18} ry={4.5} fill={water ? C.water : rice ? C.rice : '#E9E2D6'} {...O} />
      {rice && <Grains x={x} y={y - 16} n={10} spread={12} />}
    </G>
  );
}

/** A cooking pot, `x,y` bottom centre, 44 wide. */
export function Pot({
  x,
  y,
  contents = 'water',
  lid = false,
  bubbles = false,
}: Pt & {
  contents?: 'water' | 'rice' | 'empty' | 'petrol';
  lid?: boolean;
  bubbles?: boolean;
}) {
  const top = {
    water: C.water,
    rice: C.rice,
    empty: '#8E9AA2',
    petrol: '#7A6A3A',
  }[contents];
  return (
    <G>
      <Rect x={x - 28} y={y - 22} width={7} height={4} rx={2} fill={INK} />
      <Rect x={x + 21} y={y - 22} width={7} height={4} rx={2} fill={INK} />
      <Path
        d={`M${x - 22} ${y - 26} L${x - 20} ${y} L${x + 20} ${y} L${x + 22} ${y - 26} Z`}
        fill={C.steelDark}
        {...O}
      />
      {!lid && <Ellipse cx={x} cy={y - 26} rx={22} ry={5} fill={top} {...O} />}
      {!lid && contents === 'rice' && <Grains x={x} y={y - 28} n={10} spread={14} />}
      {bubbles &&
        !lid &&
        [-10, -2, 7, 13].map((dx, i) => (
          <Circle key={dx} cx={x + dx} cy={y - 27 - (i % 2) * 2} r={2.2} fill={C.white} {...edge(1)} />
        ))}
      {lid && (
        <G>
          <Ellipse cx={x} cy={y - 27} rx={23} ry={5} fill={C.steel} {...O} />
          <Rect x={x - 4} y={y - 35} width={8} height={5} rx={2} fill={INK} />
        </G>
      )}
    </G>
  );
}

/** A hob ring at x, y (its top edge). Draw the pot on it, then Flames over both. */
export function Hob({ x, y }: Pt) {
  return <Rect x={x - 26} y={y} width={52} height={5} rx={2} fill="#3B4245" {...O} />;
}

/**
 * Flames licking up from the ring, drawn in front of the pot's base so they
 * are always seen: high, low, or none. The difference is the whole point of
 * three rice steps, so it must not hide behind the pot.
 */
export function Flames({ x, y, level }: Pt & { level: 'high' | 'low' | 'off' }) {
  const h = level === 'high' ? 15 : level === 'low' ? 7 : 0;
  if (!h) return null;
  return (
    <G>
      {[-18, -9, 0, 9, 18].map((dx) => (
        <G key={dx}>
          <Path
            d={`M${x + dx - 4.5} ${y} Q${x + dx - 3} ${y - h * 0.7} ${x + dx} ${y - h} Q${x + dx + 3} ${y - h * 0.7} ${x + dx + 4.5} ${y} Z`}
            fill={C.flame}
            {...edge(1.2)}
          />
          <Path d={`M${x + dx - 2} ${y} Q${x + dx} ${y - h * 0.55} ${x + dx + 2} ${y} Z`} fill={C.flameCore} />
        </G>
      ))}
    </G>
  );
}

/** A cooker knob; `on` turns its pointer. */
export function Knob({ x, y, level }: Pt & { level: 'high' | 'low' | 'off' }) {
  const a = { high: 60, low: 150, off: -90 }[level];
  const r = (a * Math.PI) / 180;
  return (
    <G>
      <Circle cx={x} cy={y} r={7} fill="#E9ECEE" {...O} />
      <Line x1={x} y1={y} x2={x + Math.cos(r) * 5.5} y2={y + Math.sin(r) * 5.5} {...stroke(2.2)} />
    </G>
  );
}

export function PetrolCan({ ...at }: At) {
  return (
    <G transform={place(at)}>
      <Path d="M-12 0 L-12 -24 L-4 -32 L12 -32 L12 0 Z" fill={C.red} {...O} />
      <Path d="M-4 -32 L-10 -40 L-6 -42 L2 -33" fill={C.steelDark} {...O} />
      <Rect x={2} y={-30} width={8} height={4} rx={1} fill={INK} />
      <Path d="M-6 -18 L6 -6 M6 -18 L-6 -6" {...stroke(1.6, '#8E2F2F')} />
    </G>
  );
}

export function Plate({ x, y }: Pt) {
  return (
    <G>
      <Ellipse cx={x} cy={y} rx={22} ry={6} fill={C.white} {...O} />
      <Ellipse cx={x} cy={y - 1} rx={14} ry={3.4} fill="#F1ECE2" />
    </G>
  );
}

/** A front-loading washer (or dryer), `x,y` bottom-left, 46×56. */
export function Machine({
  x,
  y,
  kind = 'washer',
  open = false,
  clothes = false,
  swirl = false,
  drawer = false,
}: Pt & {
  kind?: 'washer' | 'dryer';
  open?: boolean;
  clothes?: boolean;
  swirl?: boolean;
  drawer?: boolean;
}) {
  const cx = x + 23;
  const cy = y - 26;
  return (
    <G>
      <Rect x={x} y={y - 56} width={46} height={56} rx={4} fill={kind === 'dryer' ? '#E8E2D6' : C.white} {...O} />
      <Line x1={x} y1={y - 46} x2={x + 46} y2={y - 46} {...stroke(1.4)} />
      {drawer ? (
        <Rect x={x + 4} y={y - 54} width={14} height={8} rx={1} fill="#DDE3E7" {...O} />
      ) : (
        <Rect x={x + 5} y={y - 53} width={10} height={4} rx={1} fill="#DDE3E7" {...edge(1.2)} />
      )}
      <Circle cx={x + 36} cy={y - 51} r={3} fill={C.blue} {...edge(1.2)} />
      {kind === 'dryer' && (
        <Path d={`M${x + 24} ${y - 53} q2 -2 0 -4 M${x + 28} ${y - 53} q2 -2 0 -4`} {...stroke(1.2, C.red)} />
      )}
      <Circle cx={cx} cy={cy} r={15} fill="#5E6B76" {...O} />
      <Circle cx={cx} cy={cy} r={11} fill={swirl ? C.water : '#BFD3DD'} {...O} />
      {clothes && (
        <G>
          <Circle cx={cx - 4} cy={cy + 3} r={5} fill={C.terracotta} />
          <Circle cx={cx + 4} cy={cy + 4} r={4.5} fill={C.blue} />
        </G>
      )}
      {swirl && (
        <Path d={`M${cx - 6} ${cy} a6 6 0 1 1 6 6 M${cx + 3} ${cy - 3} a3 3 0 1 0 -3 3`} {...stroke(1.6, C.white)} />
      )}
      {open && <Circle cx={x - 8} cy={cy} r={14} fill="#DDE3E7" {...O} />}
    </G>
  );
}

/** A T-shirt, centred on x,y. `dirty` adds marks. */
export function Shirt({
  x,
  y,
  color = C.blue,
  s = 1,
  dirty = false,
}: Pt & { color?: string; s?: number; dirty?: boolean }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Path
        d="M-6 -12 L-16 -8 L-20 0 L-12 3 L-11 14 L11 14 L12 3 L20 0 L16 -8 L6 -12 Q0 -7 -6 -12 Z"
        fill={color}
        {...O}
      />
      {dirty && (
        <G>
          <Ellipse cx={-4} cy={4} rx={3.5} ry={2.4} fill="#7A5A3C" opacity={0.7} />
          <Ellipse cx={5} cy={9} rx={2.4} ry={1.8} fill="#7A5A3C" opacity={0.7} />
        </G>
      )}
    </G>
  );
}

export function Detergent({ ...at }: At) {
  return (
    <G transform={place(at)}>
      <Path
        d="M-10 0 L-10 -22 Q-10 -28 -4 -28 L4 -28 L4 -32 L8 -32 L8 -28 Q10 -26 10 -22 L10 0 Z"
        fill="#4FA3C7"
        {...O}
      />
      <Rect x={-7} y={-18} width={14} height={10} rx={1.5} fill={C.white} {...edge(1.2)} />
      <Circle cx={0} cy={-13} r={2.6} fill="#4FA3C7" />
    </G>
  );
}

export function Clothesline({ y }: { y: number }) {
  return (
    <G>
      <Line x1={10} y1={y - 30} x2={10} y2={y + 60} {...stroke(3)} />
      <Line x1={150} y1={y - 30} x2={150} y2={y + 60} {...stroke(3)} />
      <Path d={`M10 ${y - 26} Q80 ${y - 12} 150 ${y - 26}`} {...stroke(1.4)} />
    </G>
  );
}

export function Peg({ x, y }: Pt) {
  return <Rect x={x - 1.6} y={y - 4} width={3.2} height={8} rx={1} fill={C.amber} {...edge(1)} />;
}

export function Car({ x, y }: Pt) {
  return (
    <G>
      <Path
        d={`M${x - 46} ${y - 12} L${x - 42} ${y - 26} L${x - 26} ${y - 28} L${x - 16} ${y - 42} L${x + 18} ${y - 42} L${x + 30} ${y - 28} L${x + 44} ${y - 24} L${x + 46} ${y - 12} Z`}
        fill={C.blue}
        {...O}
      />
      <Path
        d={`M${x - 12} ${y - 38} L${x - 4} ${y - 38} L${x - 4} ${y - 28} L${x - 20} ${y - 28} Z M${x} ${y - 38} L${x + 15} ${y - 38} L${x + 24} ${y - 28} L${x} ${y - 28} Z`}
        fill="#CFE6F2"
        {...edge(1.2)}
      />
      <Circle cx={x - 28} cy={y - 10} r={9} fill={INK} />
      <Circle cx={x - 28} cy={y - 10} r={4} fill={C.steel} />
      <Circle cx={x + 28} cy={y - 10} r={9} fill={INK} />
      <Circle cx={x + 28} cy={y - 10} r={4} fill={C.steel} />
    </G>
  );
}

export function Bubbles({ x, y }: Pt) {
  return (
    <G>
      {[
        [0, 0, 4],
        [8, -6, 3],
        [-6, -9, 2.6],
        [5, 6, 2.2],
      ].map(([dx, dy, r]) => (
        <Circle key={`${dx}${dy}`} cx={x + dx} cy={y + dy} r={r} fill={C.white} {...edge(1.1, '#7DB9D4')} />
      ))}
    </G>
  );
}

/** A fridge, `x,y` bottom-left, 50×88. `open` swings the door left and shows shelves. */
export function Fridge({ x, y, open = false, empty = false }: Pt & { open?: boolean; empty?: boolean }) {
  return (
    <G>
      <Rect x={x} y={y - 88} width={50} height={88} rx={4} fill={open ? '#F4FAFD' : C.white} {...O} />
      {open ? (
        <G>
          {[-62, -38].map((dy) => (
            <Line key={dy} x1={x + 3} y1={y + dy} x2={x + 47} y2={y + dy} {...stroke(1.6, '#9FB7C4')} />
          ))}
          {!empty && <Rect x={x + 30} y={y - 52} width={9} height={14} rx={1} fill="#DCE7F2" {...edge(1.2)} />}
          <Path d={`M${x} ${y - 88} L${x - 18} ${y - 80} L${x - 18} ${y + 4} L${x} ${y} Z`} fill="#E6ECEF" {...O} />
        </G>
      ) : (
        <G>
          <Line x1={x} y1={y - 58} x2={x + 50} y2={y - 58} {...stroke(1.4)} />
          <Rect x={x + 42} y={y - 78} width={3} height={14} rx={1.5} fill={INK} />
        </G>
      )}
    </G>
  );
}

/** Reception desk with someone behind it, `x` centre, desk top at y. */
export function Reception({ x, y }: Pt) {
  return (
    <G>
      <Person x={x} y={y} s={0.85} shirt={C.green} look="left" />
      <Rect x={x - 34} y={y - 2} width={68} height={120 - y + 2} fill="#9EB7C7" {...O} />
      <Rect x={x - 38} y={y - 6} width={76} height={6} fill="#C7D7E0" {...O} />
      <Path d={`M${x - 6} ${y + 18} h12 M${x} ${y + 12} v12`} {...stroke(3, C.red)} />
    </G>
  );
}

/** A row of waiting-room chairs from x, seats at y. */
export function Chairs({ x, y, n = 3 }: Pt & { n?: number }) {
  return (
    <G>
      {Array.from({ length: n }, (_, i) => (
        <G key={i}>
          <Rect x={x + i * 28} y={y - 26} width={24} height={26} rx={3} fill={C.terracotta} {...O} />
          <Rect x={x + i * 28 - 1} y={y} width={26} height={6} rx={2} fill="#B5654F" {...O} />
          <Line x1={x + i * 28 + 3} y1={y + 6} x2={x + i * 28 + 3} y2={y + 22} {...stroke(2.4)} />
          <Line x1={x + i * 28 + 21} y1={y + 6} x2={x + i * 28 + 21} y2={y + 22} {...stroke(2.4)} />
        </G>
      ))}
    </G>
  );
}

/** A ticket-number display, `x,y` top-left. */
export function NumberBoard({ x, y }: Pt) {
  return (
    <G>
      <Rect x={x} y={y} width={30} height={18} rx={2} fill="#2F3A44" {...O} />
      <Path d={`M${x + 8} ${y + 5} v8 M${x + 13} ${y + 5} h6 v4 h-6 v4 h6`} {...stroke(1.8, '#9FE0B5')} />
    </G>
  );
}

export function Magnifier({ x, y, r = 9 }: Pt & { r?: number }) {
  return (
    <G>
      <Line x1={x + r * 0.7} y1={y + r * 0.7} x2={x + r * 1.7} y2={y + r * 1.7} {...stroke(4)} />
      <Circle cx={x} cy={y} r={r} fill="rgba(207,230,242,0.55)" {...edge(2.4)} />
    </G>
  );
}

/** A hook on the wall, holding whatever is drawn after it. */
export function Hook({ x, y }: Pt) {
  return <Path d={`M${x} ${y - 6} v6 q0 4 4 4`} {...stroke(2.4, C.steelDark)} />;
}

export function Cupboard({ x, y, open = true }: Pt & { open?: boolean }) {
  return (
    <G>
      <Rect x={x} y={y} width={60} height={46} fill="#F7F1E6" {...O} />
      <Line x1={x} y1={y + 23} x2={x + 60} y2={y + 23} {...stroke(1.6, '#C9B79A')} />
      {open && (
        <G>
          <Path d={`M${x} ${y} L${x - 14} ${y + 5} L${x - 14} ${y + 51} L${x} ${y + 46} Z`} fill="#E8DCC6" {...O} />
          <Path
            d={`M${x + 8} ${y + 22} L${x + 9} ${y + 10} L${x + 19} ${y + 10} L${x + 20} ${y + 22} Z`}
            fill="#F4F7F9"
            {...edge(1.4)}
          />
          <Rect x={x + 8} y={y + 7} width={12} height={3} fill={C.steelDark} />
        </G>
      )}
    </G>
  );
}
