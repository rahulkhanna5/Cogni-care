import { G, Rect } from 'react-native-svg';

import {
  Bag,
  Basket,
  C,
  Cash,
  Counter,
  Cupboard,
  Door,
  Hook,
  House,
  Motion,
  outline,
  Outdoors,
  Paper,
  Pen,
  Person,
  Purse,
  Reach,
  Room,
  Scaled,
  Shelves,
  ShopFront,
  Till,
} from './kit';
import type { Scenes } from './types';

const SHIRT = C.green;

/** At the till: a cashier behind the counter, the shopper paying with cash. */
function Checkout({ shelves, items }: { shelves: boolean; items: boolean }) {
  return (
    <G>
      {shelves ? <Shelves /> : <Room wall="#F3EEE4" />}
      <Person x={120} y={86} s={0.8} look="left" shirt={C.plum} hands={[{ x: 104, y: 64 }, null]} />
      <Counter y={84} />
      <Till x={146} y={80} />
      <Basket x={66} y={82} items={items} />
      <Person x={30} y={112} look="right" shirt={SHIRT} hands={[null, { x: 86, y: 62 }]}>
        <Scaled x={82} y={52} s={0.7}>
          <Cash x={0} y={0} tilt={-12} />
        </Scaled>
      </Person>
    </G>
  );
}

export const SHOPPING: Scenes = {
  'Check what you have run out of': () => (
    <G>
      <Room wall="#F4ECDD" />
      <Cupboard x={74} y={14} />
      <Person x={36} y={112} look="right" shirt={SHIRT} hands={[null, { x: 64, y: 44 }]} />
    </G>
  ),
  'Write a shopping list': () => (
    <G>
      <Rect x={0} y={0} width={160} height={120} fill={C.wood} />
      <Paper x={46} y={10} w={58} h={92} lines={5} boxes heading={C.green} />
      <Pen x={92} y={74} tilt={35} />
      <Reach from={{ x: 168, y: 120 }} to={{ x: 108, y: 58 }} sleeve={SHIRT} />
    </G>
  ),
  'Take your bag and purse': () => (
    <G>
      <Room />
      <Hook x={50} y={28} />
      <Bag x={54} y={72} />
      <Person
        x={112}
        y={104}
        look="left"
        shirt={SHIRT}
        hands={[
          { x: 56, y: 40 },
          { x: 132, y: 90 },
        ]}
      >
        <Purse x={136} y={104} />
      </Person>
    </G>
  ),
  'Walk to the shop': () => (
    <G>
      <Outdoors />
      <ShopFront x={98} y={88} />
      <Motion x={22} y={60} dir="left" />
      <Person x={52} y={80} s={0.85} legs="walk" look="right" shirt={SHIRT} hands={[null, { x: 68, y: 80 }]}>
        <Bag x={70} y={104} />
      </Person>
    </G>
  ),
  'Pick the items on your list': () => (
    <G>
      <Shelves />
      <Basket x={36} y={118} items={false} />
      <Person
        x={116}
        y={110}
        look="left"
        shirt={SHIRT}
        hands={[
          { x: 70, y: 48 },
          { x: 138, y: 84 },
        ]}
      >
        <Rect x={64} y={40} width={10} height={16} rx={1.5} fill="#5B8FD6" {...outline} />
        <Paper x={132} y={70} w={20} h={26} lines={3} boxes ticks={1} />
      </Person>
    </G>
  ),
  'Pay at the counter': () => <Checkout shelves={false} items />,
  'Carry the shopping home': () => (
    <G>
      <Outdoors />
      <House x={102} y={88} />
      <Motion x={14} y={60} dir="left" />
      <Person
        x={50}
        y={80}
        s={0.85}
        legs="walk"
        look="right"
        shirt={SHIRT}
        hands={[
          { x: 34, y: 82 },
          { x: 66, y: 82 },
        ]}
      >
        <Bag x={34} y={110} full />
        <Bag x={66} y={110} full color={C.blue} />
      </Person>
    </G>
  ),
  'Pay before choosing the items': () => <Checkout shelves items={false} />,
  'Leave your purse at home': () => (
    <G>
      <Room />
      <Rect x={14} y={70} width={40} height={6} fill={C.wood} {...outline} />
      <Rect x={18} y={76} width={4} height={18} fill={C.woodDark} />
      <Rect x={46} y={76} width={4} height={18} fill={C.woodDark} />
      <Purse x={34} y={70} />
      <Door x={120} y={92} open />
      <Person x={92} y={60} s={0.8} legs="walk" look="right" shirt={SHIRT} />
      <Motion x={70} y={44} dir="left" n={2} />
    </G>
  ),
};
