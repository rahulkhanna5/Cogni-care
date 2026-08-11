import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export type Animal = 'owl' | 'bird' | 'frog' | 'cricket' | 'duck';
export type Position = 'left' | 'right' | 'centre';

export const ANIMALS: { id: Animal; label: string; emoji: string }[] = [
  { id: 'owl', label: 'Owl', emoji: '🦉' },
  { id: 'bird', label: 'Bird', emoji: '🐦' },
  { id: 'frog', label: 'Frog', emoji: '🐸' },
  { id: 'cricket', label: 'Cricket', emoji: '🦗' },
  { id: 'duck', label: 'Duck', emoji: '🦆' },
];

/* Static requires — Metro needs literal paths, so this table cannot be built
 * from template strings. */
const FILES: Record<string, number> = {
  'owl-left': require('../../../assets/audio/owl-left.wav'),
  'owl-right': require('../../../assets/audio/owl-right.wav'),
  'owl-centre': require('../../../assets/audio/owl-centre.wav'),
  'bird-left': require('../../../assets/audio/bird-left.wav'),
  'bird-right': require('../../../assets/audio/bird-right.wav'),
  'bird-centre': require('../../../assets/audio/bird-centre.wav'),
  'frog-left': require('../../../assets/audio/frog-left.wav'),
  'frog-right': require('../../../assets/audio/frog-right.wav'),
  'frog-centre': require('../../../assets/audio/frog-centre.wav'),
  'cricket-left': require('../../../assets/audio/cricket-left.wav'),
  'cricket-right': require('../../../assets/audio/cricket-right.wav'),
  'cricket-centre': require('../../../assets/audio/cricket-centre.wav'),
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
