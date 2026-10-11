import { G, Rect } from 'react-native-svg';

import {
  Bag,
  C,
  Calendar,
  Chairs,
  Clock,
  Door,
  Motion,
  NumberBoard,
  Paper,
  Person,
  Plain,
  Reach,
  Reception,
  Room,
  Scaled,
  Speech,
  Tablets,
  outline,
} from './kit';
import type { Scenes } from './types';

const SHIRT = C.terracotta;

export const APPOINTMENT: Scenes = {
  'Check the date and time': () => (
    <G>
      <Room />
      <Scaled x={74} y={10} s={1.3}>
        <Calendar x={0} y={0} mark={12} />
      </Scaled>
      <Clock x={140} y={34} r={13} h={10} m={30} />
      <Person x={40} y={114} glasses look="right" shirt={SHIRT} hands={[null, { x: 82, y: 50 }]} />
    </G>
  ),
  'Put your medicines list in your bag': () => (
    <G>
      <Plain fill="#E6EBEF" />
      <Scaled x={84} y={4} s={2.6}>
        <Bag x={0} y={44} color={C.plum} />
      </Scaled>
      <Paper x={58} y={14} w={34} h={44} lines={3} boxes heading={C.red} tilt={-8} />
      <Tablets x={74} y={50} n={2} />
      <Motion x={48} y={30} dir="down" n={2} />
      <Reach from={{ x: -8, y: -6 }} to={{ x: 58, y: 18 }} pose="pinch" sleeve={SHIRT} />
    </G>
  ),
  'Leave early enough to arrive on time': () => (
    <G>
      <Room />
      <Clock x={36} y={28} r={16} h={9} m={0} />
      <Door x={118} y={92} open />
      <Person x={86} y={62} s={0.8} legs="walk" look="right" shirt={SHIRT} />
      <Motion x={62} y={46} dir="left" n={2} />
    </G>
  ),
  'Tell the desk you have arrived': () => (
    <G>
      <Room wall="#E8F0EE" />
      <Reception x={118} y={78} />
      <Person x={38} y={116} look="right" shirt={SHIRT} mouth="open" />
      <Speech x={70} y={34} />
    </G>
  ),
  'Wait until you are called': () => (
    <G>
      <Room wall="#E8F0EE" />
      <NumberBoard x={112} y={12} />
      <Chairs x={24} y={84} />
      <Person
        x={64}
        y={84}
        s={0.9}
        legs="sit"
        look="right"
        shirt={SHIRT}
        hands={[
          { x: 58, y: 80 },
          { x: 72, y: 80 },
        ]}
      />
    </G>
  ),
  'Arrive the day after': () => (
    <G>
      <Room />
      <Scaled x={12} y={14} s={1.6}>
        <Calendar x={0} y={0} mark={12} next />
      </Scaled>
      <Person x={122} y={62} s={0.8} legs="walk" look="right" shirt={SHIRT} />
    </G>
  ),
  'Leave without telling the desk': () => (
    <G>
      <Room wall="#E8F0EE" />
      <Reception x={44} y={78} />
      <Door x={124} y={92} open />
      <Person x={104} y={62} s={0.8} legs="walk" look="right" shirt={SHIRT} />
      <Motion x={84} y={46} dir="left" n={2} />
    </G>
  ),
  'Go in when the doctor calls you': () => (
    <G>
      <Room wall="#E8F0EE" />
      <Door x={116} y={92} open />
      <Person x={134} y={92} s={0.75} look="left" shirt={C.green} mouth="open" />
      <Speech x={100} y={20} flip />
      <Person x={46} y={86} s={0.9} legs="walk" look="right" shirt={SHIRT} />
      <Motion x={14} y={56} dir="right" n={2} />
    </G>
  ),
  'Ask when to come back': () => (
    <G>
      <Room wall="#E8F0EE" />
      <Reception x={122} y={78} />
      <Scaled x={58} y={4} s={1}>
        <Calendar x={0} y={0} mark={12} next />
      </Scaled>
      <Person x={34} y={116} look="right" shirt={SHIRT} mouth="open" />
      <Speech x={40} y={36} />
    </G>
  ),
  'Forget your medicines list at home': () => (
    <G>
      <Room />
      <Rect x={6} y={74} width={58} height={7} rx={2} fill={C.wood} {...outline} />
      <Rect x={12} y={81} width={5} height={18} fill={C.woodDark} />
      <Rect x={53} y={81} width={5} height={18} fill={C.woodDark} />
      <Paper x={16} y={38} w={34} h={36} lines={3} boxes heading={C.red} tilt={-6} />
      <Door x={116} y={92} open />
      <Person x={90} y={86} s={0.85} legs="walk" look="right" shirt={SHIRT} />
      <Motion x={66} y={54} dir="right" n={2} />
    </G>
  ),
};
