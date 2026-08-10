/**
 * Generates the Sound Forest / Dual Task Flow audio assets.
 *
 * Why synthesised rather than recorded: sound localisation needs the same
 * sound to exist at a known left/right position, and the cleanest way to get
 * that in Expo Go — with no panning API — is to bake the position into the
 * stereo file itself. One channel loud, the other quiet, plus a small
 * inter-aural delay, which is what actually drives human localisation.
 *
 * Run: node scripts/gen-audio.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'audio');
const RATE = 22050;

/**
 * Soft bell-like tones, one per animal.
 *
 * The first version modulated each voice (up to 40Hz on the cricket) to
 * imitate a call. It read as wobbling and buzzing rather than as an animal,
 * so there is no modulation now at all — just a sine with a quiet second
 * harmonic for warmth and a long, smooth release.
 *
 * Voices are told apart by PITCH, not timbre, and the pitches are a C major
 * pentatonic so that any two heard together are consonant rather than
 * clashing. Everything sits between 260Hz and 660Hz: age-related hearing
 * loss takes the high frequencies first, and the old cricket at 2100Hz was
 * both piercing and the first thing this audience would stop hearing.
 */
const VOICES = {
  owl: { freq: 262, harmonic2: 0.12, durationMs: 900 }, // C4
  frog: { freq: 330, harmonic2: 0.14, durationMs: 850 }, // E4
  duck: { freq: 392, harmonic2: 0.12, durationMs: 850 }, // G4
  bird: { freq: 523, harmonic2: 0.1, durationMs: 800 }, // C5
  cricket: { freq: 659, harmonic2: 0.1, durationMs: 800 }, // E5
};

/** Dual Task Flow's two-way choice: a clean octave apart, unmistakable. */
const TONES = {
  'tone-high': { freq: 660, harmonic2: 0.08, durationMs: 420 },
  'tone-low': { freq: 330, harmonic2: 0.08, durationMs: 420 },
};

/** gainL, gainR, and which side leads (inter-aural time difference). */
const POSITIONS = {
  left: { gainL: 1, gainR: 0.08, leadMs: 0.6 },
  right: { gainL: 0.08, gainR: 1, leadMs: -0.6 },
  centre: { gainL: 0.7, gainR: 0.7, leadMs: 0 },
};

/**
 * Raised-cosine attack and release. A linear ramp leaves an audible click at
 * each end, and a click is exactly the harshness we are removing.
 */
function envelope(i, total) {
  const attack = total * 0.12;
  const release = total * 0.55; // long tail — the tone fades rather than stops
  if (i < attack) return 0.5 * (1 - Math.cos(Math.PI * (i / attack)));
  if (i > total - release) {
    const x = (total - i) / release;
    return 0.5 * (1 - Math.cos(Math.PI * x));
  }
  return 1;
}

function sample(voice, t) {
  const fundamental = Math.sin(2 * Math.PI * voice.freq * t);
  const second = Math.sin(2 * Math.PI * voice.freq * 2 * t) * voice.harmonic2;
  return (fundamental + second) / (1 + voice.harmonic2);
}

function buildWav(voice, position) {
  const frames = Math.floor((voice.durationMs / 1000) * RATE);
  const delay = Math.round((Math.abs(position.leadMs) / 1000) * RATE);
  const data = Buffer.alloc(frames * 4); // 2 channels x 16-bit

  for (let i = 0; i < frames; i++) {
    const env = envelope(i, frames);

    // The lagging ear hears the same sound a fraction of a millisecond later.
    const iL = position.leadMs >= 0 ? i : i - delay;
    const iR = position.leadMs <= 0 ? i : i - delay;

    const l = iL < 0 ? 0 : sample(voice, iL / RATE) * env * position.gainL * 0.7;
    const r = iR < 0 ? 0 : sample(voice, iR / RATE) * env * position.gainR * 0.7;

    data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(l * 32767))), i * 4);
    data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(r * 32767))), i * 4 + 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(2, 22); // stereo
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 4, 28); // byte rate
  header.writeUInt16LE(4, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}

mkdirSync(OUT, { recursive: true });

let count = 0;
for (const [name, voice] of Object.entries(VOICES)) {
  for (const [pos, position] of Object.entries(POSITIONS)) {
    writeFileSync(join(OUT, `${name}-${pos}.wav`), buildWav(voice, position));
    count++;
  }
}
for (const [name, voice] of Object.entries(TONES)) {
  writeFileSync(join(OUT, `${name}.wav`), buildWav(voice, POSITIONS.centre));
  count++;
}

console.log(`wrote ${count} files to assets/audio`);
