import { Ellipse, G } from 'react-native-svg';

import {
  C,
  Counter,
  Cupboard,
  edge,
  Glass,
  Jug,
  Magnifier,
  Motion,
  Paper,
  Pen,
  Person,
  PillBottle,
  Reach,
  Room,
  Scaled,
  Stream,
  Tablets,
} from './kit';
import type { Scenes } from './types';

const SHIRT = C.blue;

export const MEDICINE: Scenes = {
  'Check the label for the right medicine': () => (
    <G>
      <Room />
      <Person x={50} y={110} glasses look="right" shirt={SHIRT} hands={[null, { x: 98, y: 84 }]}>
        <PillBottle x={108} y={92} s={1.6} />
      </Person>
      <Magnifier x={106} y={62} r={13} />
    </G>
  ),
  'Check how many tablets you need': () => (
    <G>
      <Room table />
      <PillBottle x={38} y={84} tilt={-80} open />
      <Scaled x={88} y={74} s={2}>
        <Tablets x={0} y={0} n={2} />
      </Scaled>
      <Reach from={{ x: 168, y: 34 }} to={{ x: 112, y: 62 }} pose="point" sleeve={SHIRT} />
    </G>
  ),
  'Pour a glass of water': () => (
    <G>
      <Room table />
      <Glass x={98} y={84} s={1.7} level={0.45} />
      <Stream a={{ x: 80, y: 36 }} b={{ x: 96, y: 58 }} />
      <Jug x={52} y={46} tilt={42} fill="#D6ECF5" />
      <Reach from={{ x: -8, y: 60 }} to={{ x: 44, y: 28 }} sleeve={SHIRT} />
    </G>
  ),
  'Take the tablets with the water': () => (
    <G>
      <Room />
      <Person
        x={80}
        y={116}
        s={1.15}
        mouth="open"
        shirt={SHIRT}
        hands={[
          { x: 60, y: 82 },
          { x: 98, y: 88 },
        ]}
      >
        <Glass x={100} y={94} s={1.3} tilt={-28} level={0.5} />
      </Person>
      <Ellipse cx={68} cy={74} rx={3.4} ry={2.4} fill={C.white} {...edge(1.3)} />
    </G>
  ),
  'Tick it off on your chart': () => (
    <G>
      <Room wall="#E8EEF3" />
      <Paper x={40} y={10} w={70} h={66} lines={5} boxes ticks={4} heading={C.blue} />
      <Pen x={50} y={63} tilt={35} />
      <Reach from={{ x: 168, y: 112 }} to={{ x: 66, y: 48 }} pose="hold" sleeve={SHIRT} />
    </G>
  ),
  'Take a second dose to be safe': () => (
    <G>
      <Room table />
      <Scaled x={60} y={78} s={1.8}>
        <Tablets x={0} y={0} n={2} />
      </Scaled>
      <Scaled x={92} y={80} s={1.8}>
        <Tablets x={0} y={0} n={2} />
      </Scaled>
      <Ellipse cx={98} cy={58} rx={3.4} ry={2.4} fill={C.white} {...edge(1.3)} />
      <Motion x={92} y={46} dir="down" n={2} />
      <PillBottle x={112} y={40} s={1.3} tilt={-140} open />
      <Reach from={{ x: 168, y: 6 }} to={{ x: 124, y: 26 }} sleeve={SHIRT} />
    </G>
  ),
  'Skip the water': () => (
    <G>
      <Room />
      <Person
        x={66}
        y={118}
        s={1.1}
        mouth="open"
        shirt={SHIRT}
        hands={[
          { x: 50, y: 82 },
          { x: 118, y: 88 },
        ]}
      />
      <Ellipse cx={56} cy={76} rx={3.4} ry={2.4} fill={C.white} {...edge(1.3)} />
      <Counter y={104} />
      <Glass x={134} y={102} s={1.5} level={0.7} />
      <Motion x={148} y={80} dir="right" n={2} />
    </G>
  ),
  'Close the bottle tightly': () => (
    <G>
      <Room table />
      <PillBottle x={80} y={84} s={2.2} />
      <Motion x={52} y={42} dir="down" n={2} />
      <Reach from={{ x: 168, y: 18 }} to={{ x: 88, y: 24 }} pose="pinch" sleeve={SHIRT} />
    </G>
  ),
  'Put the bottle back in the cupboard': () => (
    <G>
      <Room wall="#F4ECDD" />
      <Cupboard x={68} y={14} open />
      <PillBottle x={104} y={36} s={0.75} />
      <Reach from={{ x: 168, y: 100 }} to={{ x: 110, y: 30 }} sleeve={SHIRT} />
    </G>
  ),
  'Leave the bottle open on the table': () => (
    <G>
      <Room table />
      <PillBottle x={104} y={84} s={1.8} open tilt={-80} />
      <Scaled x={44} y={80} s={1.6}>
        <Tablets x={0} y={0} n={3} />
      </Scaled>
    </G>
  ),
};
