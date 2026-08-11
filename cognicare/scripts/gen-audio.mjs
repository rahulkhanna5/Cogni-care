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
 * Short pip trains, one voice per animal.
 *
 * Three earlier attempts and what each got wrong:
 *
 * 1. Modulated tones imitating calls — read as wobbling and buzzing.
 * 2. Pure sines at 260-660Hz with a long soft fade. Calm, but inaudible in
 *    practice: a phone speaker rolls off steeply below ~500Hz, so the 262Hz
 *    owl barely existed. Protecting against age-related hearing loss by going
 *    LOW ignored what the hardware can actually reproduce.
 * 3. That same slow fade-in also destroyed localisation. The auditory system
 *    locates a sound from its ONSET — interaural time and level differences
 *    are computed at the attack. A gentle 100ms ramp removes exactly the cue
 *    Sound Forest is built on.
 *
 * So: 500-1050Hz, which small speakers handle well and still sits an octave
 * below where presbycusis bites; three short pips with a 6ms attack, giving
 * three sharp onsets to localise instead of one blurred one; and harmonics,
 * because a pure sine is the quietest waveform there is for a given peak.
 */
const VOICES = {
  owl: { freq: 523, pips: 3 }, // C5
  frog: { freq: 587, pips: 3 }, // D5
  duck: { freq: 698, pips: 3 }, // F5
  bird: { freq: 784, pips: 3 }, // G5
  cricket: { freq: 1046, pips: 3 }, // C6
};

/** Dual Task Flow's two-way choice: an octave apart, unmistakable. */
const TONES = {
  'tone-high': { freq: 1046, pips: 1 },
  'tone-low': { freq: 523, pips: 1 },
};

const PIP_MS = 110;
const PIP_GAP_MS = 70;
/** Near the ceiling — these were far too quiet on a handset. */
const PEAK = 0.92;

/**
 * gainL, gainR, and which side leads (interaural time difference).
 *
 * The quiet side is at 4%, about 28dB down — wider than a real head shadow,
 * deliberately, because this is a training task and the direction must be
 * unmistakable rather than realistic. 0.65ms is near the maximum real ITD.
 */
const POSITIONS = {
  left: { gainL: 1, gainR: 0.04, leadMs: 0.65 },
  right: { gainL: 0.04, gainR: 1, leadMs: -0.65 },
  centre: { gainL: 0.78, gainR: 0.78, leadMs: 0 },
};

/**
 * Per-pip envelope: 6ms attack, then decay to silence.
 *
 * The attack is short enough to give the auditory system a crisp onset to
 * localise, and still long enough (about 260 samples at 22kHz) to avoid the
 * click a hard edge would produce.
 */
function pipEnvelope(i, pipSamples, rate) {
  const attack = Math.max(1, Math.round(0.006 * rate));
  if (i < attack) return 0.5 * (1 - Math.cos(Math.PI * (i / attack)));
  const x = (i - attack) / Math.max(1, pipSamples - attack);
  return Math.max(0, Math.cos((Math.PI / 2) * x)); // smooth decay to zero
}

/** Fundamental plus two harmonics. A bare sine is the quietest waveform there
 *  is for a given peak, and small speakers reproduce harmonics better than
 *  the fundamental anyway. */
function tone(freq, t) {
  return (
    Math.sin(2 * Math.PI * freq * t) +
    0.35 * Math.sin(2 * Math.PI * freq * 2 * t) +
    0.15 * Math.sin(2 * Math.PI * freq * 3 * t)
  ) / 1.5;
}

/** Soft clip — keeps the level high without the crackle of hard clipping. */
const softClip = (x) => Math.tanh(x * 1.2);

/** Amplitude of the whole pip train at sample i, plus the tone itself. */
function sample(voice, i, rate) {
  const pipSamples = Math.round((PIP_MS / 1000) * rate);
  const gapSamples = Math.round((PIP_GAP_MS / 1000) * rate);
  const stride = pipSamples + gapSamples;

  const index = Math.floor(i / stride);
  if (index >= voice.pips) return 0;

  const withinPip = i - index * stride;
  if (withinPip >= pipSamples) return 0; // in the gap

  return tone(voice.freq, i / rate) * pipEnvelope(withinPip, pipSamples, rate);
}

const totalSamples = (voice, rate) =>
  voice.pips * Math.round(((PIP_MS + PIP_GAP_MS) / 1000) * rate);

function buildWav(voice, position) {
  const delay = Math.round((Math.abs(position.leadMs) / 1000) * RATE);
  const frames = totalSamples(voice, RATE) + delay;
  const data = Buffer.alloc(frames * 4); // 2 channels x 16-bit

  for (let i = 0; i < frames; i++) {
    // The lagging ear hears the same sound a fraction of a millisecond later.
    const iL = position.leadMs >= 0 ? i : i - delay;
    const iR = position.leadMs <= 0 ? i : i - delay;

    const l = iL < 0 ? 0 : softClip(sample(voice, iL, RATE) * position.gainL) * PEAK;
    const r = iR < 0 ? 0 : softClip(sample(voice, iR, RATE) * position.gainR) * PEAK;

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
