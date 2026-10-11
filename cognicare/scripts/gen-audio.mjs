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
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'audio');
const RATE = 22050;

/**
 * One call per animal — every animal in Sound Forest is now a real recording,
 * cut to a single call by scripts/cut-recordings.py.
 *
 * Why not synthesise them: four attempts at imitating calls with tones failed.
 * Modulated tones read as buzzing; low sines were inaudible on a phone speaker
 * (it rolls off below ~500Hz); a gentle fade-in destroyed localisation, which
 * is computed from a sound's ONSET; and giving every animal the same three
 * pips a semitone apart made them indistinguishable. A real dog, goat, cat,
 * duck and crow differ in rhythm and timbre — the cues that survive age — and
 * need nothing invented. The synthesiser below is kept for Dual Task Flow's
 * two pips.
 *
 * A recording is placed left, right and centre exactly as a synthesised voice
 * was. Every call ends inside 750ms, since the tightest level plays one every
 * 900ms.
 */
const note = (at, dur, from, to = from, am = 0) => ({ at, dur, from, to, am });

/** Harmonic weights, fundamental first. */
const TIMBRE = {
  tone: [1, 0.35, 0.15], // Dual Task Flow's pips
};

const VOICES = {
  dog: { recording: 'dog' },
  goat: { recording: 'goat' },
  cat: { recording: 'cat' },
  duck: { recording: 'duck' },
  crow: { recording: 'crow' },
};

/** Dual Task Flow's two-way choice: an octave apart, unmistakable. */
const TONES = {
  'tone-high': { timbre: 'tone', notes: [note(0, 110, 1046)] },
  'tone-low': { timbre: 'tone', notes: [note(0, 110, 523)] },
};

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
 * Per-note envelope: 6ms attack, then a smooth fall to silence. Long notes
 * hold before falling, so a hoot sounds held rather than plucked.
 *
 * The attack is short enough to give the auditory system a crisp onset to
 * localise, and still long enough (about 130 samples at 22kHz) to avoid the
 * click a hard edge would produce.
 */
function envelope(t, dur) {
  const attack = 0.006;
  if (t < attack) return 0.5 * (1 - Math.cos(Math.PI * (t / attack)));
  const hold = dur > 0.15 ? 0.6 * dur : attack;
  if (t < hold) return 1;
  const x = (t - hold) / Math.max(1e-6, dur - hold);
  return Math.max(0, Math.cos((Math.PI / 2) * x));
}

/** One note at time t (seconds into the note): a pitch glide, its harmonics,
 *  and — for the croak — a fast pulse that makes it rasp. */
function noteSample(n, weights, t) {
  const dur = n.dur / 1000;
  if (t < 0 || t >= dur) return 0;
  // Phase of a linear glide from `from` to `to` over the note.
  const phase = 2 * Math.PI * (n.from * t + ((n.to - n.from) * t * t) / (2 * dur));
  let s = 0;
  for (let h = 0; h < weights.length; h++) s += weights[h] * Math.sin((h + 1) * phase);
  s /= weights.reduce((a, b) => a + b, 0);
  const pulse = n.am ? 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(2 * Math.PI * n.am * t)) ** 2 : 1;
  return s * pulse * envelope(t, dur);
}

/** Soft clip — keeps the level high without the crackle of hard clipping. */
const softClip = (x) => Math.tanh(x * 1.2);

/** A cut clip from assets/audio/source/: 16-bit mono PCM at RATE. */
function readClip(name) {
  const buf = readFileSync(join(OUT, 'source', `${name}.wav`));
  let at = 12;
  while (buf.toString('ascii', at, at + 4) !== 'data') at += 8 + buf.readUInt32LE(at + 4);
  const size = buf.readUInt32LE(at + 4);
  if (buf.readUInt32LE(24) !== RATE || buf.readUInt16LE(22) !== 1) throw new Error(`${name}.wav must be mono at ${RATE}Hz`);
  return Float32Array.from({ length: size / 2 }, (_, k) => buf.readInt16LE(at + 8 + k * 2) / 32768);
}
for (const voice of Object.values(VOICES)) if (voice.recording) voice.clip = readClip(voice.recording);

function sample(voice, i, rate) {
  if (voice.clip) return voice.clip[i] ?? 0;
  const t = i / rate;
  const weights = TIMBRE[voice.timbre];
  let s = 0;
  for (const n of voice.notes) s += noteSample(n, weights, t - n.at / 1000);
  // The pulsed croak and the harmonic-heavy quack measure quieter than a
  // hoot at the same peak; lift them so no animal is the faint one.
  return s * (voice.gain ?? 1);
}

const totalSamples = (voice, rate) =>
  voice.clip
    ? voice.clip.length
    : Math.ceil((Math.max(...voice.notes.map((n) => n.at + n.dur)) / 1000) * rate);

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
