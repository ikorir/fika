// The effective commute (D5): the commute the engine and the routes fetch see for a date. The Today screen calls it
// once; nothing else reads `arriveBy` for a day. Demo mode's saved commute bypasses it.
import type { Commute } from '@/contract';
import { weekdayOf } from '@/engine/days';
import { nairobiDate } from '@/engine/holidays';
import { commuteDeadline } from '@/time';

/** To work in the morning, or home in the evening (ticket 08). */
export type Direction = 'work' | 'home';

/**
 * The commute as it stands on `date` (its Nairobi calendar day): that weekday's own arrive-by when it has one. A day
 * without one gets the very same commute object back, so nothing downstream sees a change.
 */
export function effectiveCommute(commute: Commute, { date, direction }: { date: Date; direction: Direction }): Commute {
  if (direction === 'home') throw new Error('effectiveCommute: the trip home is not yet built (ticket 08).');
  const arriveBy = commute.arriveByByDay?.[weekdayOf(date)];
  return arriveBy && arriveBy !== commute.arriveBy ? { ...commute, arriveBy } : commute;
}

/**
 * The Nairobi day the Today screen is about at `now`, as the instant it starts: today, until two hours past today's
 * deadline, then tomorrow — the same turn `commuteDeadline` makes. When tomorrow's arrive-by is later in the day than
 * today's, it would still read as today's for a while after today's is over; until it no longer does, the screen
 * stays on today's commute, whose deadline has already moved on to tomorrow.
 */
export function commuteDayAt(commute: Commute, now: Date): Date {
  const today = nairobiDate(now);
  const deadline = new Date(commuteDeadline(effectiveCommute(commute, { date: now, direction: 'work' }).arriveBy, now));
  const tomorrow = nairobiDate(deadline);
  if (tomorrow === today) return new Date(`${today}T00:00:00+03:00`);
  const next = effectiveCommute(commute, { date: deadline, direction: 'work' });
  const day = nairobiDate(new Date(commuteDeadline(next.arriveBy, now))) === tomorrow ? tomorrow : today;
  return new Date(`${day}T00:00:00+03:00`);
}
