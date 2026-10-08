import Svg from 'react-native-svg';

import { APPOINTMENT } from './art/appointment';
import { BILL } from './art/bill';
import { LETTER } from './art/letter';
import { MEDICINE } from './art/medicine';
import { RICE } from './art/rice';
import { SHOPPING } from './art/shopping';
import { TEA } from './art/tea';
import { WASHING } from './art/washing';
import type { Scene, Scenes } from './art/types';

/**
 * Every step's picture, found by the step's own words — so a step written in
 * tasks.ts gets its picture with no wiring, and the sequencing logic never
 * learns pictures exist. The same words in two routines share one picture,
 * which is right: the same action looks the same.
 *
 * A step with no scene yet shows ActionCard's fallback; scenes.test.ts fails
 * if any step that ships lacks one.
 */
export const SCENES: Scenes = {
  ...TEA,
  ...MEDICINE,
  ...SHOPPING,
  ...LETTER,
  ...BILL,
  ...RICE,
  ...WASHING,
  ...APPOINTMENT,
};

export const sceneFor = (step: string): Scene | undefined => SCENES[step];

/** The scene for a step, drawn to fill its card — or undefined. */
export function stepPicture(step: string) {
  const scene = sceneFor(step);
  if (!scene) return undefined;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice">
      {scene()}
    </Svg>
  );
}
