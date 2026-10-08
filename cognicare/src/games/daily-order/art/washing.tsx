import { G } from 'react-native-svg';

import { C, Clothesline, Detergent, Machine, Motion, Outdoors, Peg, Person, Reach, Room, Scaled, Shirt, Stream } from './kit';
import type { Scenes } from './types';

const SHIRT = C.blue;

/** Shirts pegged on the line; `dirty` for the ones that were never washed. */
function Line({ dirty }: { dirty: boolean }) {
  return (
    <G>
      <Outdoors />
      <Clothesline y={42} />
      <Shirt x={44} y={44} color={C.amber} dirty={dirty} />
      <Peg x={36} y={32} />
      <Peg x={52} y={32} />
      <Shirt x={84} y={46} color={C.white} dirty={dirty} />
      <Peg x={76} y={34} />
      <Peg x={92} y={34} />
      <Person
        x={130}
        y={92}
        s={0.85}
        legs="stand"
        look="left"
        shirt={SHIRT}
        hands={[
          { x: 110, y: 40 },
          { x: 132, y: 40 },
        ]}
      >
        <Shirt x={120} y={46} color={C.terracotta} dirty={dirty} s={0.9} />
      </Person>
    </G>
  );
}

export const WASHING: Scenes = {
  'Sort the dirty clothes': () => (
    <G>
      <Room />
      <Shirt x={32} y={104} color={C.white} />
      <Shirt x={36} y={98} color="#F1E3C8" />
      <Shirt x={128} y={104} color="#2F3A44" />
      <Shirt x={124} y={98} color={C.plum} />
      <Person
        x={80}
        y={96}
        shirt={SHIRT}
        hands={[
          { x: 44, y: 66 },
          { x: 116, y: 66 },
        ]}
      >
        <Shirt x={38} y={74} color={C.white} s={0.8} />
        <Shirt x={122} y={74} color="#2F3A44" s={0.8} />
      </Person>
    </G>
  ),
  'Put them in the machine': () => (
    <G>
      <Room />
      <Machine x={40} y={112} open />
      <Person x={130} y={98} look="left" shirt={SHIRT} hands={[{ x: 76, y: 86 }, null]}>
        <Shirt x={70} y={88} color={C.terracotta} s={0.75} />
      </Person>
    </G>
  ),
  'Add the detergent': () => (
    <G>
      <Room />
      <Machine x={40} y={118} drawer />
      <Stream a={{ x: 82, y: 34 }} b={{ x: 52, y: 62 }} color="#4FA3C7" w={3.5} />
      <Detergent x={104} y={42} s={1.2} tilt={-100} />
      <Reach from={{ x: 168, y: 56 }} to={{ x: 118, y: 40 }} sleeve={SHIRT} />
    </G>
  ),
  'Start the machine': () => (
    <G>
      <Room />
      <Scaled x={28} y={116} s={1.4}>
        <Machine x={0} y={0} clothes swirl />
      </Scaled>
      <Motion x={16} y={80} dir="left" n={2} />
      <Reach from={{ x: 168, y: 40 }} to={{ x: 92, y: 46 }} pose="point" sleeve={SHIRT} />
    </G>
  ),
  'Hang the clothes out to dry': () => <Line dirty={false} />,
  'Dry them before washing': () => <Line dirty />,
  'Add detergent to the dryer': () => (
    <G>
      <Room />
      <Scaled x={34} y={116} s={1.35}>
        <Machine x={0} y={0} kind="dryer" open />
      </Scaled>
      <Stream a={{ x: 76, y: 48 }} b={{ x: 64, y: 76 }} color="#4FA3C7" w={3.5} />
      <Detergent x={112} y={40} s={1.2} tilt={-100} />
      <Reach from={{ x: 168, y: 56 }} to={{ x: 124, y: 38 }} sleeve={SHIRT} />
    </G>
  ),
};
