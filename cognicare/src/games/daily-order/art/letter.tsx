import { G, Line, Rect } from 'react-native-svg';

import {
  Bin,
  C,
  Clock,
  edge,
  Envelope,
  Motion,
  Outdoors,
  Paper,
  Pen,
  Person,
  Plain,
  PostBox,
  Reach,
  Room,
  Scaled,
  Stamp,
  stroke,
} from './kit';
import type { Scenes } from './types';

const SHIRT = C.plum;
const DESK = '#E9D5B5';

export const LETTER: Scenes = {
  'Write the letter': () => (
    <G>
      <Plain fill={DESK} />
      <Paper x={44} y={6} w={62} h={104} lines={8} />
      <Pen x={88} y={76} tilt={35} />
      <Reach from={{ x: 168, y: 120 }} to={{ x: 104, y: 60 }} sleeve={SHIRT} />
    </G>
  ),
  'Fold it and put it in an envelope': () => (
    <G>
      <Plain fill={DESK} />
      <Scaled x={36} y={66} s={2.2}>
        <Envelope x={0} y={0} open />
      </Scaled>
      {/* The letter, folded in three, going in. */}
      <Rect x={50} y={42} width={60} height={46} rx={2} fill={C.paper} {...edge()} />
      <Line x1={50} y1={57} x2={110} y2={57} {...stroke(1.2, '#C9BFA9')} />
      <Line x1={50} y1={72} x2={110} y2={72} {...stroke(1.2, '#C9BFA9')} />
      <Scaled x={36} y={66} s={2.2}>
        <Rect x={0} y={4} width={40} height={22} rx={1} fill="#F7EEDB" {...edge(0.9)} />
      </Scaled>
      <Motion x={128} y={44} dir="down" n={2} />
      <Reach from={{ x: 150, y: -10 }} to={{ x: 104, y: 38 }} pose="pinch" sleeve={SHIRT} />
    </G>
  ),
  'Write the address on the front': () => (
    <G>
      <Plain fill={DESK} />
      <Scaled x={22} y={26} s={2.6}>
        <Envelope x={0} y={0} address />
      </Scaled>
      <Pen x={92} y={76} tilt={35} />
      <Reach from={{ x: 168, y: 120 }} to={{ x: 108, y: 60 }} sleeve={SHIRT} />
    </G>
  ),
  'Stick a stamp on it': () => (
    <G>
      <Plain fill={DESK} />
      <Scaled x={22} y={40} s={2.6}>
        <Envelope x={0} y={0} address />
      </Scaled>
      <Scaled x={112} y={22} s={2.6}>
        <Stamp x={0} y={0} />
      </Scaled>
      <Motion x={104} y={30} dir="down" n={2} />
      <Reach from={{ x: 168, y: -8 }} to={{ x: 134, y: 18 }} pose="pinch" sleeve={SHIRT} />
    </G>
  ),
  'Take it to the post box': () => (
    <G>
      <Outdoors />
      <PostBox x={66} y={112} />
      <Person x={118} y={86} s={0.9} legs="stand" look="left" shirt={SHIRT} hands={[{ x: 84, y: 66 }, null]}>
        <Envelope x={66} y={58} address stamp tilt={-8} />
      </Person>
    </G>
  ),
  'Post it without an address': () => (
    <G>
      <Outdoors />
      <Scaled x={76} y={-20} s={2.2}>
        <PostBox x={0} y={60} />
      </Scaled>
      <Envelope x={58} y={16} tilt={-6} />
      <Motion x={52} y={14} dir="down" n={2} />
      <Reach from={{ x: 168, y: 10 }} to={{ x: 98, y: 22 }} sleeve={SHIRT} />
    </G>
  ),
  'Open the envelope again': () => (
    <G>
      <Plain fill={DESK} />
      <Rect x={50} y={20} width={60} height={50} rx={2} fill={C.paper} {...edge()} />
      <Line x1={58} y1={32} x2={100} y2={32} {...stroke(1.2, '#9AA6AE')} />
      <Line x1={58} y1={40} x2={94} y2={40} {...stroke(1.2, '#9AA6AE')} />
      <Scaled x={36} y={50} s={2.2}>
        <Envelope x={0} y={0} address stamp torn />
      </Scaled>
      <Motion x={126} y={22} dir="up" n={2} />
      <Reach from={{ x: 168, y: -12 }} to={{ x: 112, y: 18 }} pose="pinch" sleeve={SHIRT} />
      <Reach from={{ x: -8, y: 128 }} to={{ x: 40, y: 98 }} sleeve={SHIRT} />
    </G>
  ),
  'Drop it in the post box': () => (
    <G>
      <Outdoors />
      <Scaled x={76} y={-20} s={2.2}>
        <PostBox x={0} y={60} />
      </Scaled>
      <Envelope x={56} y={-4} address stamp tilt={-8} />
      <Motion x={48} y={8} dir="down" n={2} />
      <Reach from={{ x: 168, y: 10 }} to={{ x: 100, y: 12 }} pose="pinch" sleeve={SHIRT} />
    </G>
  ),
  'Check when the post is collected': () => (
    <G>
      <Outdoors />
      <Scaled x={44} y={-8} s={1.7}>
        <PostBox x={0} y={62} />
      </Scaled>
      <Line x1={100} y1={52} x2={100} y2={88} {...stroke(3)} />
      <Clock x={100} y={36} r={18} h={5} m={0} />
      <Person x={136} y={90} s={0.8} glasses look="left" shirt={SHIRT} hands={[{ x: 118, y: 70 }, null]} />
    </G>
  ),
  'Put the letter in the bin instead': () => (
    <G>
      <Room />
      <Scaled x={50} y={0} s={2}>
        <Bin x={20} y={58} />
      </Scaled>
      <Envelope x={70} y={6} address stamp tilt={-12} />
      <Motion x={56} y={22} dir="down" n={2} />
      <Reach from={{ x: 168, y: -6 }} to={{ x: 112, y: 14 }} pose="pinch" sleeve={SHIRT} />
    </G>
  ),
};
