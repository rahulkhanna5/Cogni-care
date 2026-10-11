import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export type Animal = 'dog' | 'crow' | 'goat' | 'cat' | 'duck';
export type Position = 'left' | 'right' | 'centre';

export const ANIMALS: { id: Animal; label: string }[] = [
  // Order is difficulty order: a level uses the first N, so the two that open
  // the game — a short sharp bark and a rough caw — are the easiest to tell apart.
  { id: 'dog', label: 'Dog' },
  { id: 'crow', label: 'Crow' },
  { id: 'goat', label: 'Goat' },
  { id: 'cat', label: 'Cat' },
  { id: 'duck', label: 'Duck' },
];

/* Static requires — Metro needs literal paths, so this table cannot be built
 * from template strings. */
const FILES: Record<string, number> = {
  'dog-left': require('../../../assets/audio/dog-left.wav'),
  'dog-right': require('../../../assets/audio/dog-right.wav'),
  'dog-centre': require('../../../assets/audio/dog-centre.wav'),
  'crow-left': require('../../../assets/audio/crow-left.wav'),
  'crow-right': require('../../../assets/audio/crow-right.wav'),
  'crow-centre': require('../../../assets/audio/crow-centre.wav'),
  'goat-left': require('../../../assets/audio/goat-left.wav'),
  'goat-right': require('../../../assets/audio/goat-right.wav'),
  'goat-centre': require('../../../assets/audio/goat-centre.wav'),
  'cat-left': require('../../../assets/audio/cat-left.wav'),
  'cat-right': require('../../../assets/audio/cat-right.wav'),
  'cat-centre': require('../../../assets/audio/cat-centre.wav'),
  'duck-left': require('../../../assets/audio/duck-left.wav'),
  'duck-right': require('../../../assets/audio/duck-right.wav'),
  'duck-centre': require('../../../assets/audio/duck-centre.wav'),
  'tone-high': require('../../../assets/audio/tone-high.wav'),
  'tone-low': require('../../../assets/audio/tone-low.wav'),
};

const cache = new Map<string, AudioPlayer>();

export async function prepareAudio(): Promise<void> {
  // Without this the forest is silent on a phone left on vibrate, which reads
  // as the game being broken.
  await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
}

export function play(key: string): void {
  const source = FILES[key];
  if (!source) return;

  let player = cache.get(key);
  if (!player) {
    player = createAudioPlayer(source);
    // Set explicitly rather than trusting the default — these were reported
    // as inaudible on a real handset.
    player.volume = 1;
    cache.set(key, player);
  }
  player.seekTo(0);
  player.play();
}

export const playAnimal = (animal: Animal, position: Position) => play(`${animal}-${position}`);

/** createAudioPlayer is not hook-managed, so these must be released by hand. */
export function releaseAudio(): void {
  for (const player of cache.values()) {
    try {
      player.remove();
    } catch {
      // already gone
    }
  }
  cache.clear();
}
