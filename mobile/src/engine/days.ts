// Which days are commute days (P11, W6): what the morning reminders are scheduled for.
import type { Commute, Weekday } from '@/contract';
import { isPublicHoliday, nairobiDate } from '@/engine/holidays';

const DAY_MS = 24 * 60 * 60 * 1000;
// Date.getUTCDay() order, read off a Nairobi midnight written as UTC.
const BY_UTC_DAY: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
// Enough to find any count of commute days a week asks for, whatever the holidays; a guard, never reached.
const MAX_DAYS_AHEAD = 366;

/** The instant a Nairobi calendar day starts. */
const nairobiMidnight = (date: Date) => new Date(`${nairobiDate(date)}T00:00:00+03:00`);

/** The day of the week `date` falls on in Nairobi. */
export function weekdayOf(date: Date): Weekday {
  return BY_UTC_DAY[new Date(`${nairobiDate(date)}T00:00:00Z`).getUTCDay()];
}

/**
 * The next `count` commute days on or after the Nairobi calendar day of `from`, each as the instant it starts in
 * Nairobi. Saturday and Sunday are skipped while weekends are quiet, and Kenyan public holidays always are.
 */
export function commuteDays(commute: Pick<Commute, 'quietWeekends'>, from: Date, count: number): Date[] {
  const days: Date[] = [];
  const first = nairobiMidnight(from).getTime();
  for (let i = 0; days.length < count && i < MAX_DAYS_AHEAD; i++) {
    // Nairobi keeps UTC+3 all year, so a day is always 24 hours.
    const day = new Date(first + i * DAY_MS);
    const weekend = weekdayOf(day) === 'sat' || weekdayOf(day) === 'sun';
    if ((commute.quietWeekends && weekend) || isPublicHoliday(day)) continue;
    days.push(day);
  }
  return days;
}
