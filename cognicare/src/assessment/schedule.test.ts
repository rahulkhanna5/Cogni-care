import { checkInWindow } from './schedule';

// Local times on purpose: the lock counts days on the phone's own calendar.
const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h);
const sqlite = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' '); // as SQLite stores it (UTC)

it('is open before the first check-in', () => {
  expect(checkInWindow(null)).toEqual({ locked: false, opensOn: null, daysLeft: 0 });
});

it('locks for six days and opens on the seventh, the same weekday next week', () => {
  const monday = at(2026, 10, 12, 18); // Monday evening
  const taken = sqlite(monday);
  expect(checkInWindow(taken, at(2026, 10, 12, 19))).toMatchObject({ locked: true, daysLeft: 7 });
  expect(checkInWindow(taken, at(2026, 10, 13))).toMatchObject({ locked: true, daysLeft: 6 });
  expect(checkInWindow(taken, at(2026, 10, 18, 23))).toMatchObject({ locked: true, daysLeft: 1 }); // Sunday night
  const nextMonday = checkInWindow(taken, at(2026, 10, 19, 0));
  expect(nextMonday).toMatchObject({ locked: false, daysLeft: 0 });
  expect(nextMonday.opensOn!.getDay()).toBe(1);
  expect(checkInWindow(taken, at(2026, 10, 25))).toMatchObject({ locked: false }); // later is fine too
});

it('reads both the stored SQLite form and an ISO date', () => {
  const iso = at(2026, 10, 12).toISOString();
  expect(checkInWindow(iso, at(2026, 10, 14)).daysLeft).toBe(5);
});
