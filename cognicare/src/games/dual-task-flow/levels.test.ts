import { buildNumbers, buildTones, dualLevel, DUAL_LEVELS } from './levels';

describe('dual task streams', () => {
  it('marks odd numbers as the visual targets', () => {
    const stream = buildNumbers(dualLevel(1));
    for (const item of stream) {
      expect(item.isTarget).toBe(item.value % 2 === 1);
    }
  });

  it('keeps numbers inside the level range', () => {
    const spec = dualLevel(7);
    const stream = buildNumbers(spec);
    expect(stream).toHaveLength(spec.visualCount);
    for (const item of stream) {
      expect(item.value).toBeGreaterThanOrEqual(1);
      expect(item.value).toBeLessThanOrEqual(spec.range);
    }
  });

  it('produces both high and low tones over a long stream', () => {
    const tones = buildTones(200);
    expect(tones.some((t) => t.isTarget)).toBe(true);
    expect(tones.some((t) => !t.isTarget)).toBe(true);
  });

  it('never runs the two streams on the same period', () => {
    // If they lock in phase the task collapses into a single rhythm and stops
    // measuring divided attention.
    for (const spec of DUAL_LEVELS) {
      expect(spec.visualIntervalMs).not.toBe(spec.audioIntervalMs);
    }
  });

  it('gets harder monotonically', () => {
    for (let i = 1; i < DUAL_LEVELS.length; i++) {
      expect(DUAL_LEVELS[i].visualIntervalMs).toBeLessThanOrEqual(
        DUAL_LEVELS[i - 1].visualIntervalMs
      );
      expect(DUAL_LEVELS[i].range).toBeGreaterThanOrEqual(DUAL_LEVELS[i - 1].range);
    }
  });
});
