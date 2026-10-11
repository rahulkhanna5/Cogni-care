import { G, Rect } from 'react-native-svg';

import {
  Bubbles,
  C,
  Car,
  Chairs,
  Clock,
  Cup,
  Drops,
  Fridge,
  Jug,
  Kettle,
  Kitchen,
  Motion,
  Outdoors,
  outline,
  Person,
  Reach,
  Room,
  Scaled,
  Steam,
  Stream,
  SugarBowl,
  Tap,
  TeaBag,
} from './kit';
import type { Scenes } from './types';

export const TEA: Scenes = {
  'Fill the kettle with water': () => (
    <G>
      <Kitchen />
      <Tap x={56} y={24} />
      <Stream a={{ x: 56, y: 27 }} b={{ x: 56, y: 44 }} w={3.5} />
      <Person x={124} y={82} look="left" hands={[{ x: 76, y: 58 }, null]} shirt={C.terracotta}>
        <Kettle x={56} y={72} flip />
      </Person>
    </G>
  ),
  'Switch the kettle on': () => (
    <G>
      <Kitchen />
      <Kettle x={64} y={80} s={1.6} onBase light />
      <Motion x={92} y={70} dir="right" />
      <Reach from={{ x: 160, y: 120 }} to={{ x: 98, y: 92 }} pose="point" sleeve={C.terracotta} />
    </G>
  ),
  'Put a tea bag in the cup': () => (
    <G>
      <Kitchen />
      <Cup x={80} y={100} s={1.8} />
      <Scaled x={80} y={14} s={1.6}>
        <TeaBag x={0} y={0} />
      </Scaled>
      <Motion x={60} y={48} dir="down" n={2} />
      <Reach from={{ x: 160, y: -10 }} to={{ x: 94, y: 6 }} pose="pinch" sleeve={C.terracotta} />
    </G>
  ),
  'Pour the hot water into the cup': () => (
    <G>
      <Kitchen />
      <Cup x={104} y={100} s={1.6} fill="tea" />
      <Stream a={{ x: 90, y: 40 }} b={{ x: 102, y: 70 }} />
      <Kettle x={56} y={46} tilt={35} />
      <Reach from={{ x: -6, y: 52 }} to={{ x: 42, y: 24 }} sleeve={C.terracotta} />
      <Steam x={126} y={64} n={2} />
    </G>
  ),
  'Let it brew, then remove the tea bag': () => (
    <G>
      <Kitchen />
      <Clock x={130} y={26} r={13} h={4} m={10} />
      <Cup x={74} y={104} s={1.8} fill="tea" />
      <Scaled x={74} y={10} s={1.5}>
        <TeaBag x={0} y={0} />
      </Scaled>
      <Drops x={72} y={52} color={C.tea} />
      <Reach from={{ x: 160, y: -10 }} to={{ x: 86, y: 6 }} pose="pinch" sleeve={C.terracotta} />
    </G>
  ),
  'Add milk or sugar if you like': () => (
    <G>
      <Kitchen />
      <Cup x={74} y={100} s={1.6} fill="milky" />
      <Stream a={{ x: 66, y: 38 }} b={{ x: 74, y: 70 }} color={C.white} w={3.5} />
      <Jug x={38} y={50} tilt={42} />
      <Reach from={{ x: -8, y: 56 }} to={{ x: 22, y: 30 }} sleeve={C.terracotta} />
      <SugarBowl x={128} y={100} />
    </G>
  ),
  'Wash the car': () => (
    <G>
      <Outdoors />
      <Car x={58} y={112} />
      <Bubbles x={74} y={84} />
      <Bubbles x={50} y={92} />
      <Person x={128} y={86} s={0.9} legs="stand" look="left" hands={[{ x: 100, y: 80 }, null]} shirt={C.terracotta} />
      {/* The sponge, in front of the hand so it is seen. */}
      <Rect x={84} y={72} width={16} height={12} rx={3} fill={C.amber} {...outline} />
    </G>
  ),
  'Put the cup in the fridge': () => (
    <G>
      <Room />
      <Fridge x={22} y={112} open />
      <Person x={116} y={80} s={0.95} legs="stand" look="left" hands={[{ x: 62, y: 60 }, null]} shirt={C.terracotta}>
        <Cup x={52} y={70} fill="tea" />
      </Person>
    </G>
  ),
  'Carry the cup to your chair': () => (
    <G>
      <Room />
      <Chairs x={104} y={92} n={1} />
      <Person x={54} y={86} s={0.9} legs="walk" look="right" shirt={C.terracotta} hands={[null, { x: 80, y: 70 }]} />
      <Cup x={82} y={76} s={1.3} fill="tea" />
      <Steam x={84} y={54} n={2} />
      <Motion x={14} y={60} dir="left" n={2} />
    </G>
  ),
  'Put the tea bag in the kettle': () => (
    <G>
      <Kitchen />
      <Kettle x={80} y={102} s={2} onBase />
      <Scaled x={80} y={14} s={1.5}>
        <TeaBag x={0} y={0} />
      </Scaled>
      <Motion x={60} y={56} dir="down" n={2} />
      <Reach from={{ x: 168, y: -10 }} to={{ x: 92, y: 12 }} pose="pinch" sleeve={C.terracotta} />
    </G>
  ),
};
