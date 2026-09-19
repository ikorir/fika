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
