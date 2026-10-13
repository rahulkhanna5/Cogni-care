import { toIso } from '@/db/stats';
import { useLanguage } from '@/i18n/language';

/**
 * The check-in is weekly. Once finished it locks for six days and opens again
 * on the seventh — the same weekday next week (taken Monday, opens Monday).
 * Counted in calendar days on the phone's own clock, so taking it late on
 * Monday evening still opens it first thing next Monday.
 *
 * Weekly because the questions ask how things have felt "lately": answering
 * them every day would mostly measure the day, and give the doctor noise.
 */
export const CHECKIN_EVERY_DAYS = 7;

export type CheckInWindow = {
  locked: boolean;
  /** Local midnight on the day it opens again; null if never taken. */
  opensOn: Date | null;
  /** Whole days until it opens (1 = tomorrow); 0 when open. */
  daysLeft: number;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function checkInWindow(lastTakenAt: string | null | undefined, now: Date = new Date()): CheckInWindow {
  if (!lastTakenAt) return { locked: false, opensOn: null, daysLeft: 0 };
  const taken = startOfDay(new Date(toIso(lastTakenAt)));
  const opensOn = new Date(taken.getFullYear(), taken.getMonth(), taken.getDate() + CHECKIN_EVERY_DAYS);
  const today = startOfDay(now);
  // Round, not floor: a day across a daylight-saving change is 23 or 25 hours.
  const daysLeft = Math.max(0, Math.round((opensOn.getTime() - today.getTime()) / 86_400_000));
  return { locked: daysLeft > 0, opensOn, daysLeft };
}

const LOCALE = { en: undefined, hi: 'hi-IN', pa: 'pa-IN' } as const;

/** "Monday 19 October", in the language the app is set to. */
export const formatOpensOn = (d: Date) =>
  d.toLocaleDateString(LOCALE[useLanguage.getState().lang], { weekday: 'long', day: 'numeric', month: 'long' });
