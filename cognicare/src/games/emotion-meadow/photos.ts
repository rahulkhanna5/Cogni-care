import type { ImageSourcePropType } from 'react-native';

import type { Emotion } from './Face';

/**
 * Real photographed faces, when you have them.
 *
 * NONE ARE BUNDLED, deliberately. Photographs of real people in a health app
 * need the subject's consent, and for anything research-facing the emotion
 * labels are only meaningful if the images come from a validated set — one
 * where the expression each face shows has been rated by many observers.
 * Random internet photos would give you a game that looks better and measures
 * nothing.
 *
 * Sets that are free for academic use, on application:
 *
 *   KDEF   — Karolinska Directed Emotional Faces (kdef.se)
 *   RaFD   — Radboud Faces Database (rafd.socsci.ru.nl)
 *   NimStim — nimstim.macbrain.org
 *   FACES  — Max Planck, ages 19 to 80, which matters here because most sets
 *            are students and this app's users are not (faces.mpib-berlin.mpg.de)
 *
 * FACES is the one to ask for first: older faces are harder to read for
 * everyone, and training on twenty-year-olds does not transfer well.
 *
 * To use them:
 *   1. Put the files in assets/faces/<emotion>/, e.g. assets/faces/angry/01.jpg
 *   2. Add a require() for each below. Metro needs literal paths, so this
 *      table cannot be built from a loop.
 *   3. That is all — the game picks photos up automatically and drops the
 *      drawn faces.
 *
 * Licences almost always forbid redistribution, so keep assets/faces/ out of
 * version control if the repository is public.
 */
export const FACE_PHOTOS: Partial<Record<Emotion, ImageSourcePropType[]>> = {
  // happy: [require('../../../assets/faces/happy/01.jpg')],
  // sad: [require('../../../assets/faces/sad/01.jpg')],
  // angry: [require('../../../assets/faces/angry/01.jpg')],
  // surprised: [require('../../../assets/faces/surprised/01.jpg')],
  // worried: [require('../../../assets/faces/worried/01.jpg')],
  // calm: [require('../../../assets/faces/calm/01.jpg')],
};

/**
 * True only when EVERY emotion in play has at least one photo. A round that
 * mixed photographs with drawings would be trivially solvable — the odd one
 * out is visible without reading a single expression.
 */
export function hasPhotosFor(emotions: Emotion[]): boolean {
  return emotions.every((e) => (FACE_PHOTOS[e]?.length ?? 0) > 0);
}

export function pickPhoto(
  emotion: Emotion,
  seed: number
): ImageSourcePropType | null {
  const options = FACE_PHOTOS[emotion];
  if (!options?.length) return null;
  return options[seed % options.length] ?? null;
}
