// Nairobi is UTC+3 all year (no daylight saving), so a fixed offset is exact.
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

/** "8:05", "17:30": 24-hour Nairobi wall-clock time for display. */
export function formatTime(iso: string | Date): string {
  const local = new Date(new Date(iso).getTime() + NAIROBI_OFFSET_MS);
  return `${local.getUTCHours()}:${pad(local.getUTCMinutes())}`;
}

/** The instant a Nairobi "HH:mm" falls on, on the Nairobi calendar day of `now`, as ISO with +03:00. */
export function nairobiTimeOnDay(hhmm: string, now: Date): string {
  const local = new Date(now.getTime() + NAIROBI_OFFSET_MS);
  const day = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
  return `${day}T${hhmm}:00+03:00`;
}

/** "09:00" → "9:00": a stored commute time, formatted like formatTime. */
export function formatClock(hhmm: string): string {
  return hhmm.replace(/^0(\d)/, '$1');
}

// Until this long after the deadline the screen is still about today's commute (so lateness shows).
const STILL_TODAY_MS = 2 * 60 * 60 * 1000;

/** The deadline the screen is about: today's, until two hours after it, then tomorrow's. ISO with +03:00. */
export function commuteDeadline(arriveBy: string, now: Date): string {
  const today = nairobiTimeOnDay(arriveBy, now);
  if (now.getTime() <= Date.parse(today) + STILL_TODAY_MS) return today;
  return nairobiTimeOnDay(arriveBy, new Date(now.getTime() + 24 * 60 * 60 * 1000));
}
