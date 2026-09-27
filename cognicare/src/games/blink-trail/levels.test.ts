import { BLINK_LEVELS, BLINK_MAX_LEVEL, blinkLevel, describeBlinkLevel } from './levels';

describe('Blink Trail levels', () => {
  it('adds exactly one light at every level: 3, then 4, then 5 …', () => {
    BLINK_LEVELS.forEach((spec, i) => expect(spec.length).toBe(3 + i));
  });

  it('changes nothing else between levels, so each step is one more light', () => {
    for (const spec of BLINK_LEVELS) {
      expect(spec).toEqual(expect.objectContaining({ cols: 3, rows: 4, flashMs: 800, gapMs: 300, replays: 1 }));
    }
  });

  it('uses a board one row taller than it is wide', () => {
    for (const spec of BLINK_LEVELS) expect(spec.rows).toBe(spec.cols + 1);
  });

  it('stops at ten lights', () => {
    expect(BLINK_MAX_LEVEL).toBe(8);
    expect(blinkLevel(BLINK_MAX_LEVEL).length).toBe(10);
  });

  it('keeps a player saved at an old, higher level on the hardest one there is', () => {
    // The game had 15 levels; progress saved at 9-15 must still load.
    expect(blinkLevel(15)).toBe(blinkLevel(BLINK_MAX_LEVEL));
  });

  it('describes a level in plain words', () => {
    expect(describeBlinkLevel(2)).toBe('4 lights to remember, on a 3 by 4 grid');
  });
});
