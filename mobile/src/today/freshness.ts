// How old the numbers on screen are. The app never polls, so the commuter has to be able to see this.
import { formatTime, nairobiTimeOnDay } from '@/time';

const MIN = 60_000;
const DAY_MS = 24 * 60 * MIN;

/** Until this long after a fetch the numbers still count as fresh, and the label is just the time. */
export const STALE_AFTER_MIN = 10;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const nairobiDay = (d: Date) => nairobiTimeOnDay('00:00', d);

/** "3 h 5 min", "25 min": how long ago, in whole minutes. */
function howOld(min: number): string {
  if (min < 60) return `${min} min`;
  const hours = Math.floor(min / 60);
  return min % 60 ? `${hours} h ${min % 60} min` : `${hours} h`;
}

/** "18 Sep", off the front of the Nairobi day's ISO string, which is already on the right calendar. */
function dayName(fetched: Date): string {
  const [, month, day] = nairobiDay(fetched).slice(0, 10).split('-').map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

/**
 * "Updated 7:40" while the numbers are fresh, then how old they are: "Updated 7:40 · 25 min old",
 * "Updated yesterday 7:40", "Updated 18 Sep 7:40". `stale` is what turns the label amber.
 */
export function updatedLabel(fetchedAt: string, now: Date): { text: string; stale: boolean } {
  const fetched = new Date(fetchedAt);
  const time = formatTime(fetched);
  const today = nairobiDay(now);

  if (nairobiDay(fetched) !== today) {
    const yesterday = nairobiDay(new Date(now.getTime() - DAY_MS));
    const day = nairobiDay(fetched) === yesterday ? 'yesterday' : dayName(fetched);
    return { text: `Updated ${day} ${time}`, stale: true };
  }

  const min = Math.floor((now.getTime() - fetched.getTime()) / MIN);
  if (min < STALE_AFTER_MIN) return { text: `Updated ${time}`, stale: false };
  return { text: `Updated ${time} · ${howOld(min)} old`, stale: true };
}
