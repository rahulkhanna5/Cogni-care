import { G } from 'react-native-svg';

import {
  Bowl,
  C,
  Clock,
  Flames,
  Grains,
  Hob,
  Kitchen,
  Knob,
  Motion,
  PetrolCan,
  Plate,
  Pot,
  Reach,
  RiceSack,
  Scoop,
  Steam,
  Stream,
  Tap,
} from './kit';
import type { Scenes } from './types';

const SLEEVE = C.green;

/** A pot on the hob, the knob on the counter front. */
function Stove({
  flame,
  lid,
  bubbles,
  contents = 'water',
}: {
  flame: 'high' | 'low' | 'off';
  lid: boolean;
  bubbles: boolean;
  contents?: 'water' | 'petrol';
}) {
  return (
    <G>
      <Hob x={70} y={84} />
      <Pot x={70} y={78} lid={lid} bubbles={bubbles} contents={contents} />
      <Flames x={70} y={84} level={flame} />
      <Knob x={128} y={102} level={flame} />
    </G>
  );
}

export const RICE: Scenes = {
  'Measure the rice': () => (
    <G>
      <Kitchen />
      <RiceSack x={50} y={96} />
      <Scoop x={92} y={64} s={1.4} />
      <Grains x={90} y={70} n={4} spread={4} />
      <Reach from={{ x: 168, y: 82 }} to={{ x: 126, y: 48 }} sleeve={SLEEVE} />
    </G>
  ),
  'Rinse it under water': () => (
    <G>
      <Kitchen />
      <Tap x={76} y={16} />
      <Stream a={{ x: 76, y: 20 }} b={{ x: 76, y: 74 }} w={3.5} />
      <Bowl x={80} y={96} water />
      <Grains x={80} y={80} n={10} spread={12} />
      <Reach from={{ x: 168, y: 112 }} to={{ x: 102, y: 80 }} sleeve={SLEEVE} />
    </G>
  ),
  'Put it in the pot with water': () => (
    <G>
      <Kitchen />
      <Pot x={92} y={98} />
      <Grains x={84} y={50} n={6} spread={5} />
      <Grains x={88} y={62} n={5} spread={5} />
      <Scoop x={58} y={42} s={1.3} tilt={110} />
      <Reach from={{ x: -8, y: 30 }} to={{ x: 40, y: 50 }} sleeve={SLEEVE} />
    </G>
  ),
  'Bring it to a boil': () => (
    <G>
      <Kitchen />
      <Stove flame="high" lid={false} bubbles />
      <Steam x={70} y={50} />
    </G>
  ),
  'Turn the heat down and cover it': () => (
    <G>
      <Kitchen />
      <Stove flame="low" lid bubbles={false} />
      <Steam x={70} y={46} n={2} />
      <Reach from={{ x: 168, y: 124 }} to={{ x: 138, y: 108 }} pose="pinch" sleeve={SLEEVE} />
    </G>
  ),
  'Turn off the heat and let it rest': () => (
    <G>
      <Kitchen />
      <Clock x={130} y={28} r={13} h={1} m={15} />
      <Stove flame="off" lid bubbles={false} />
      <Reach from={{ x: 168, y: 124 }} to={{ x: 138, y: 108 }} pose="pinch" sleeve={SLEEVE} />
    </G>
  ),
  'Serve it before cooking': () => (
    <G>
      <Kitchen />
      <RiceSack x={36} y={96} />
      <Plate x={96} y={98} />
      <Grains x={96} y={94} n={12} spread={12} />
      <Grains x={96} y={78} n={4} spread={4} />
      <Scoop x={104} y={62} s={1.3} tilt={100} />
      <Reach from={{ x: 168, y: 40 }} to={{ x: 132, y: 64 }} sleeve={SLEEVE} />
    </G>
  ),
  'Add petrol to the pot': () => (
    <G>
      <Kitchen />
      <Stove flame="high" lid={false} bubbles={false} contents="petrol" />
      <Stream a={{ x: 112, y: 30 }} b={{ x: 80, y: 56 }} color="#B39B4A" w={3.5} />
      <PetrolCan x={128} y={46} tilt={-60} />
      <Reach from={{ x: 168, y: 70 }} to={{ x: 140, y: 52 }} sleeve={SLEEVE} />
      <Motion x={42} y={40} dir="left" n={2} />
    </G>
  ),
};
