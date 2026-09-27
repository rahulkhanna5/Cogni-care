import type { ImageSourcePropType } from 'react-native';

import type { Emotion } from './Face';

/**
 * Illustrated animal faces: a dog, a cat, a panda and a lion, each showing
 * happy, sad, angry and surprised. Cartoon animals, not people, so the
 * consent and licensing concerns in photos.ts do not apply.
 *
 * The source sheet gave every feeling its own background colour — yellow
 * happy, red angry, blue sad, purple surprised. Left in, a player could tap
 * "the red one" without reading a face, and the game would train colour
 * matching. Each face was cut out (macOS Vision subject lifting) and is shown
 * on the same light tile, so the expression is the only difference.
 *
 * Only the four feelings above exist here. A trial that also needs "worried"
 * or "calm" uses the drawn faces for every face in it (see faceKind).
 */

export const ANIMALS = ['dog', 'cat', 'panda', 'lion'] as const;
export type Animal = (typeof ANIMALS)[number];

type Drawn = 'happy' | 'sad' | 'angry' | 'surprised';

/* Static requires — Metro needs literal paths, so this cannot be a loop. */
const FACES: Record<Animal, Record<Drawn, ImageSourcePropType>> = {
  dog: {
    happy: require('../../../assets/faces/animals/dog-happy.webp'),
    sad: require('../../../assets/faces/animals/dog-sad.webp'),
    angry: require('../../../assets/faces/animals/dog-angry.webp'),
    surprised: require('../../../assets/faces/animals/dog-surprised.webp'),
  },
  cat: {
    happy: require('../../../assets/faces/animals/cat-happy.webp'),
    sad: require('../../../assets/faces/animals/cat-sad.webp'),
    angry: require('../../../assets/faces/animals/cat-angry.webp'),
    surprised: require('../../../assets/faces/animals/cat-surprised.webp'),
  },
  panda: {
    happy: require('../../../assets/faces/animals/panda-happy.webp'),
    sad: require('../../../assets/faces/animals/panda-sad.webp'),
    angry: require('../../../assets/faces/animals/panda-angry.webp'),
    surprised: require('../../../assets/faces/animals/panda-surprised.webp'),
  },
  lion: {
    happy: require('../../../assets/faces/animals/lion-happy.webp'),
    sad: require('../../../assets/faces/animals/lion-sad.webp'),
    angry: require('../../../assets/faces/animals/lion-angry.webp'),
    surprised: require('../../../assets/faces/animals/lion-surprised.webp'),
  },
};

const covered = (e: Emotion): e is Drawn => e in FACES.dog;

export function hasAnimalFacesFor(emotions: Emotion[]): boolean {
  return emotions.every(covered);
}

export function animalFace(animal: Animal, emotion: Emotion): ImageSourcePropType | null {
  return covered(emotion) ? FACES[animal][emotion] : null;
}
