import { buildTimeline, dualLevel, DUAL_LEVELS } from './levels';

describe('dual task timeline', () => {
  /**
   * The streams used to run concurrently on different periods. A number and a
   * tone could land together, leaving no way to tell which button the moment
   * belonged to. Exactly one item is live at any time now.
   */
  it('presents one item at a time', () => {
    const timeline = buildTimeline(dualLevel(5));
    expect(timeline).toHaveLength(dualLevel(5).totalItems);
    for (const event of timeline) {
      expect(['visual', 'audio']).toContain(event.modality);
    }
  });

  it('marks odd numbers as visual targets', () => {
    for (const event of buildTimeline(dualLevel(9))) {
      if (event.modality === 'visual') {
        expect(event.isTarget).toBe(event.value % 2 === 1);
      }
    }
  });

  it('marks only the high tone as an audio target', () => {
    for (const event of buildTimeline(dualLevel(9))) {
      if (event.modality === 'audio') {
        expect(event.isTarget).toBe(event.value === 1);
      }
    }
  });

  it('keeps numbers inside the level range', () => {
    const spec = dualLevel(12);
    for (const event of buildTimeline(spec)) {
      if (event.modality === 'visual') {
        expect(event.value).toBeGreaterThanOrEqual(1);
        expect(event.value).toBeLessThanOrEqual(spec.range);
      }
    }
  });

  it('never lets one modality run more than four in a row', () => {
    // A long run would let the player stop switching, which is the load
    // this game exists to measure.
    for (let attempt = 0; attempt < 200; attempt++) {
      const timeline = buildTimeline(dualLevel(15));
      let run = 1;
      for (let i = 1; i < timeline.length; i++) {
        run = timeline[i].modality === timeline[i - 1].modality ? run + 1 : 1;
        expect(run).toBeLessThanOrEqual(4);
      }
    }
  });

  it('uses both modalities over a full round', () => {
    const timeline = buildTimeline(dualLevel(15));
    expect(timeline.some((e) => e.modality === 'visual')).toBe(true);
    expect(timeline.some((e) => e.modality === 'audio')).toBe(true);
  });

  it('gets harder monotonically', () => {
    for (let i = 1; i < DUAL_LEVELS.length; i++) {
      expect(DUAL_LEVELS[i].stepMs).toBeLessThanOrEqual(DUAL_LEVELS[i - 1].stepMs);
      expect(DUAL_LEVELS[i].range).toBeGreaterThanOrEqual(DUAL_LEVELS[i - 1].range);
      expect(DUAL_LEVELS[i].totalItems).toBeGreaterThanOrEqual(DUAL_LEVELS[i - 1].totalItems);
    }
  });
});
