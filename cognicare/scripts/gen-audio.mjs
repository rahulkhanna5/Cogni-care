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

/** Distinct timbres so the animals stay tellable apart by ear alone. */
const VOICES = {
  owl: { freq: 400, harmonics: [1, 0.35], warble: 5, durationMs: 900 },
  bird: { freq: 1300, harmonics: [1, 0.2], warble: 18, durationMs: 550 },
  frog: { freq: 220, harmonics: [1, 0.6, 0.3], warble: 9, durationMs: 700 },
  cricket: { freq: 2100, harmonics: [1, 0.15], warble: 40, durationMs: 500 },
  duck: { freq: 620, harmonics: [1, 0.5, 0.25], warble: 14, durationMs: 650 },
};

/** Pure tones for the Dual Task Flow auditory stream. */
const TONES = {
  'tone-high': { freq: 1000, harmonics: [1], warble: 0, durationMs: 350 },
  'tone-low': { freq: 350, harmonics: [1], warble: 0, durationMs: 350 },
};

/** gainL, gainR, and which side leads (inter-aural time difference). */
const POSITIONS = {
  left: { gainL: 1, gainR: 0.08, leadMs: 0.6 },
  right: { gainL: 0.08, gainR: 1, leadMs: -0.6 },
  centre: { gainL: 0.7, gainR: 0.7, leadMs: 0 },
};

function envelope(i, total) {
  const attack = total * 0.08;
  const release = total * 0.35;
  if (i < attack) return i / attack;
  if (i > total - release) return (total - i) / release;
  return 1;
}

function sample(voice, t) {
  const wobble = voice.warble ? 1 + 0.06 * Math.sin(2 * Math.PI * voice.warble * t) : 1;
  let v = 0;
  voice.harmonics.forEach((amp, n) => {
    v += amp * Math.sin(2 * Math.PI * voice.freq * wobble * (n + 1) * t);
  });
  return v / voice.harmonics.reduce((a, b) => a + b, 0);
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
