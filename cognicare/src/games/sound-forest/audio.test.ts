/**
 * Checks the sound files the game actually ships, not the code that made
 * them: two of the five animals are now real recordings, and a recording can
 * go wrong in ways a synthesiser cannot — a slow start, a long tail, a quiet
 * take, a stereo file panned the wrong way.
 */
import { ANIMALS } from './sounds';

// The app is React Native and has no Node types; Jest runs on Node, so the
// few calls needed here are typed by hand rather than adding @types/node.
type Bytes = {
  toString(encoding: 'ascii', start: number, end: number): string;
  readUInt32LE(offset: number): number;
  readInt16LE(offset: number): number;
};
const { readFileSync } = require('fs') as { readFileSync: (path: string) => Bytes };
const { join } = require('path') as { join: (...parts: string[]) => string };
declare const __dirname: string;

const AUDIO = join(__dirname, '..', '..', '..', 'assets', 'audio');

function read(name: string) {
  const buf = readFileSync(join(AUDIO, `${name}.wav`));
  let at = 12;
  while (buf.toString('ascii', at, at + 4) !== 'data') at += 8 + buf.readUInt32LE(at + 4);
  const rate = buf.readUInt32LE(24);
  const frames = buf.readUInt32LE(at + 4) / 4; // stereo, 16-bit
  const left = new Float64Array(frames);
  const right = new Float64Array(frames);
  for (let i = 0; i < frames; i++) {
    left[i] = buf.readInt16LE(at + 8 + i * 4) / 32768;
    right[i] = buf.readInt16LE(at + 10 + i * 4) / 32768;
  }
  return { rate, left, right };
}

const energy = (x: Float64Array) => x.reduce((a, v) => a + v * v, 0);
const rms = (x: Float64Array) => Math.sqrt(energy(x) / x.length);
const peak = (x: Float64Array) => x.reduce((a, v) => Math.max(a, Math.abs(v)), 0);

describe.each(ANIMALS.map((a) => a.id))('%s', (animal) => {
  it('ends in time for the fastest level (a sound every 900ms)', () => {
    for (const side of ['left', 'right', 'centre']) {
      const { rate, left } = read(`${animal}-${side}`);
      expect(left.length / rate).toBeLessThanOrEqual(0.76);
    }
  });

  it('starts sharply — left and right are told apart from the onset', () => {
    const { rate, left } = read(`${animal}-centre`);
    const first = left.subarray(0, Math.round(0.02 * rate));
    expect(peak(first)).toBeGreaterThanOrEqual(0.3 * peak(left));
  });

  it('comes from the left ear only on the left, and the right only on the right', () => {
    const l = read(`${animal}-left`);
    const r = read(`${animal}-right`);
    expect(energy(l.left) / energy(l.right)).toBeGreaterThan(100);
    expect(energy(r.right) / energy(r.left)).toBeGreaterThan(100);
  });

  it('is balanced in the middle', () => {
    const c = read(`${animal}-centre`);
    const ratio = energy(c.left) / energy(c.right);
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.25);
  });

  it('is not the faint one', () => {
    const { left } = read(`${animal}-centre`);
    expect(rms(left)).toBeGreaterThan(0.12);
    expect(peak(left)).toBeLessThan(0.99); // and never clipped flat
  });
});
