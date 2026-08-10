import {
  advance,
  createEngine,
  isComplete,
  schedule,
  summarise,
  tap,
  type FallerSpec,
} from './falling';

const spec = (over: Partial<FallerSpec> & { id: number }): FallerSpec => ({
  kind: 'target',
  label: 'Bread',
  emoji: '🍞',
  x: 0.5,
  spawnAtMs: 0,
  travelMs: 2000,
  direction: 'down',
  ...over,
});

describe('falling engine', () => {
  it('activates an item only once its spawn time arrives', () => {
    const s = createEngine(10_000, [spec({ id: 1, spawnAtMs: 1000 })]);

    advance(s, 500);
    expect(s.items[0].status).toBe('pending');

    advance(s, 1200);
    expect(s.items[0].status).toBe('active');
  });

  it('counts an untapped target as a miss when it leaves the board', () => {
    const s = createEngine(10_000, [spec({ id: 1, travelMs: 1000 })]);

    advance(s, 1500);

    expect(s.items[0].status).toBe('expired');
    expect(s.misses).toBe(1);
    expect(s.hits).toBe(0);
  });

  it('does not penalise a distractor that leaves untapped', () => {
    const s = createEngine(10_000, [spec({ id: 1, kind: 'distractor', travelMs: 1000 })]);

    advance(s, 1500);

    expect(s.misses).toBe(0);
    expect(s.falseAlarms).toBe(0);
  });

  it('scores a tapped target and records its latency', () => {
    const s = createEngine(10_000, [spec({ id: 1, spawnAtMs: 200 })]);

    advance(s, 700);
    tap(s, 1, 700);

    expect(s.hits).toBe(1);
    expect(s.score).toBe(10);
    expect(s.latencies).toEqual([500]);
  });

  it('penalises a tapped distractor as a false alarm, never below zero', () => {
    const s = createEngine(10_000, [
      spec({ id: 1, kind: 'distractor' }),
      spec({ id: 2, kind: 'forbidden' }),
    ]);

    advance(s, 100);
    tap(s, 1, 100);
    tap(s, 2, 100);

    expect(s.falseAlarms).toBe(2);
    expect(s.hits).toBe(0);
    expect(s.score).toBe(0); // clamped, not negative
  });

  it('ignores taps on items that are not on screen', () => {
    const s = createEngine(10_000, [spec({ id: 1, spawnAtMs: 5000 })]);

    advance(s, 100);
    tap(s, 1, 100); // not spawned yet

    expect(s.hits).toBe(0);
    expect(s.falseAlarms).toBe(0);
  });

  it('ignores a second tap on the same item', () => {
    const s = createEngine(10_000, [spec({ id: 1 })]);

    advance(s, 100);
    tap(s, 1, 100);
    tap(s, 1, 150);

    expect(s.hits).toBe(1);
    expect(s.score).toBe(10);
  });

  it('reports accuracy over targets only', () => {
    const s = createEngine(10_000, [
      spec({ id: 1 }),
      spec({ id: 2 }),
      spec({ id: 3, kind: 'distractor' }),
    ]);

    advance(s, 100);
    tap(s, 1, 100); // hit
    tap(s, 3, 100); // false alarm
    advance(s, 3000); // item 2 falls past

    const out = summarise(s);
    expect(out).toMatchObject({ hits: 1, misses: 1, falseAlarms: 1, accuracy: 0.5 });
  });

  it('completes when every item is resolved, without waiting out the clock', () => {
    const s = createEngine(60_000, [spec({ id: 1, travelMs: 500 })]);

    expect(isComplete(s)).toBe(false);
    advance(s, 600);
    expect(isComplete(s)).toBe(true);
  });
});

describe('schedule', () => {
  const pool = [{ label: 'Bread', emoji: '🍞' }];

  it('creates the requested mix and leaves room for the last item to cross', () => {
    let seed = 0;
    const specs = schedule({
      durationMs: 20_000,
      travelMs: 4000,
      targetCount: 4,
      distractorCount: 8,
      forbiddenCount: 2,
      targets: pool,
      distractors: pool,
      forbidden: pool,
      random: () => ((seed = (seed * 9301 + 49297) % 233280) / 233280),
    });

    expect(specs.filter((s) => s.kind === 'target')).toHaveLength(4);
    expect(specs.filter((s) => s.kind === 'distractor')).toHaveLength(8);
    expect(specs.filter((s) => s.kind === 'forbidden')).toHaveLength(2);

    // Nothing spawns so late that it cannot finish crossing.
    for (const s of specs) {
      expect(s.spawnAtMs).toBeLessThanOrEqual(20_000 - 4000);
      expect(s.x).toBeGreaterThanOrEqual(0.1);
      expect(s.x).toBeLessThanOrEqual(0.9);
    }
  });

  it('spawns every target at least once', () => {
    // Regression: targets used to be drawn at random from the pool, so a
    // 3-item shopping list could spawn one item twice and omit the third
    // entirely — the player was asked to find something never shown.
    const list = [
      { label: 'Fish', emoji: '🐟' },
      { label: 'Honey', emoji: '🍯' },
      { label: 'Butter', emoji: '🧈' },
    ];

    for (let run = 0; run < 100; run++) {
      const specs = schedule({
        durationMs: 24_000,
        travelMs: 6000,
        targetCount: list.length,
        distractorCount: 6,
        targets: list,
        distractors: pool,
      });

      const spawned = specs.filter((s) => s.kind === 'target').map((s) => s.label).sort();
      expect(spawned).toEqual(['Butter', 'Fish', 'Honey']);
    }
  });

  it('is ordered by spawn time', () => {
    const specs = schedule({
      durationMs: 20_000,
      travelMs: 3000,
      targetCount: 5,
      distractorCount: 10,
      targets: pool,
      distractors: pool,
    });
    const times = specs.map((s) => s.spawnAtMs);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});
