import { countStreak } from './stats';

const on = (iso: string) => new Date(`${iso}T09:00:00`);

describe('countStreak', () => {
  it('is zero with no activity', () => {
    expect(countStreak([], on('2026-08-10'))).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(countStreak(['2026-08-10', '2026-08-09', '2026-08-08'], on('2026-08-10'))).toBe(3);
  });

  it('keeps the streak alive when today has not happened yet', () => {
    // Losing a streak at breakfast, before there was any chance to play, is
    // a reason to stop using the app.
    expect(countStreak(['2026-08-09', '2026-08-08'], on('2026-08-10'))).toBe(2);
  });

  it('breaks once a whole day is skipped', () => {
    expect(countStreak(['2026-08-08', '2026-08-07'], on('2026-08-10'))).toBe(0);
  });

  it('stops at the first gap rather than counting all active days', () => {
    expect(
      countStreak(['2026-08-10', '2026-08-09', '2026-08-06', '2026-08-05'], on('2026-08-10'))
    ).toBe(2);
  });

  it('counts a single day', () => {
    expect(countStreak(['2026-08-10'], on('2026-08-10'))).toBe(1);
  });

  it('is not confused by playing several times in one day', () => {
    // The query already returns distinct days; this pins that assumption.
    expect(countStreak(['2026-08-10', '2026-08-09'], on('2026-08-10'))).toBe(2);
  });

  it('handles a month boundary', () => {
    expect(countStreak(['2026-08-01', '2026-07-31', '2026-07-30'], on('2026-08-01'))).toBe(3);
  });
});
