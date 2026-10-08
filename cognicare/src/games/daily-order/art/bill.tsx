import { G } from 'react-native-svg';

import {
  Bill,
  Bin,
  C,
  Calendar,
  Cash,
  Folder,
  Magnifier,
  Motion,
  Person,
  Phone,
  Plain,
  Reach,
  Receipt,
  Room,
  Scaled,
} from './kit';
import type { Scenes } from './types';

const SHIRT = C.blue;
const DESK = '#E6EBEF';

export const BILL: Scenes = {
  'Find the bill and check the amount': () => (
    <G>
      <Room />
      <Person x={44} y={116} glasses look="right" shirt={SHIRT} hands={[null, { x: 82, y: 92 }]}>
        <Scaled x={78} y={18} s={1.6}>
          <Bill x={0} y={0} />
        </Scaled>
      </Person>
      <Magnifier x={118} y={78} r={13} />
    </G>
  ),
  'Check the last date to pay': () => (
    <G>
      <Plain fill={DESK} />
      <Scaled x={10} y={30} s={1.3}>
        <Bill x={0} y={0} tilt={-6} />
      </Scaled>
      <Scaled x={76} y={14} s={1.7}>
        <Calendar x={0} y={0} mark={13} />
      </Scaled>
      <Reach from={{ x: 168, y: 120 }} to={{ x: 128, y: 84 }} pose="point" sleeve={SHIRT} />
    </G>
  ),
  'Open your bank app or take cash': () => (
    <G>
      <Plain fill={DESK} />
      <Scaled x={30} y={8} s={1.9}>
        <Phone x={0} y={0} screen="bank" />
      </Scaled>
      <Reach from={{ x: 40, y: 130 }} to={{ x: 56, y: 100 }} sleeve={SHIRT} />
      <Scaled x={98} y={60} s={1.5}>
        <Cash x={0} y={0} tilt={-10} />
      </Scaled>
    </G>
  ),
  'Make the payment': () => (
    <G>
      <Plain fill={DESK} />
      <Scaled x={10} y={40} s={1.1}>
        <Bill x={0} y={0} tilt={-8} />
      </Scaled>
      <Scaled x={60} y={6} s={2.3}>
        <Phone x={0} y={0} screen="pay" />
      </Scaled>
      <Reach from={{ x: 168, y: 126 }} to={{ x: 112, y: 92 }} pose="point" sleeve={SHIRT} />
    </G>
  ),
  'Keep the receipt': () => (
    <G>
      <Plain fill={DESK} />
      <Scaled x={36} y={52} s={2.1}>
        <Folder x={0} y={0} />
      </Scaled>
      <Scaled x={72} y={8} s={1.5}>
        <Receipt x={0} y={0} tilt={6} />
      </Scaled>
      <Motion x={60} y={24} dir="down" n={2} />
      <Reach from={{ x: 168, y: -10 }} to={{ x: 112, y: 14 }} pose="pinch" sleeve={SHIRT} />
    </G>
  ),
  'Throw the bill away first': () => (
    <G>
      <Room />
      <Scaled x={50} y={0} s={2}>
        <Bin x={20} y={58} />
      </Scaled>
      <Scaled x={60} y={18} s={1.3}>
        <Bill x={0} y={0} scrunched />
      </Scaled>
      <Motion x={60} y={14} dir="down" n={2} />
      <Reach from={{ x: 168, y: -6 }} to={{ x: 112, y: 22 }} sleeve={SHIRT} />
    </G>
  ),
  'Pay twice to be safe': () => (
    <G>
      <Plain fill={DESK} />
      <Scaled x={18} y={8} s={2.2}>
        <Phone x={0} y={0} screen="twice" />
      </Scaled>
      <Scaled x={96} y={20} s={1.5}>
        <Receipt x={0} y={0} tilt={-8} />
      </Scaled>
      <Scaled x={112} y={34} s={1.5}>
        <Receipt x={0} y={0} tilt={8} />
      </Scaled>
    </G>
  ),
};
