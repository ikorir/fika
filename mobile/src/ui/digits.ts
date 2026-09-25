// Which characters of a time change, and which way, when it goes from one value to the next. Pure: RollingDigits
// renders the answer.

export type Direction = 'up' | 'down';

/** One character of the new string: whether it differs from the one before it, and which way it rolls if it does. */
export type DigitChange = { char: string; changed: boolean; direction: Direction | null };

const isDigit = (c: string) => c >= '0' && c <= '9' && c.length === 1;

/** "7:50", "10:05": a time as the screen shows one. */
export const isClockTime = (s: string) => /^\d{1,2}:\d{2}$/.test(s);

/** The characters of `s` lined up from the right against `length` places: '' where it has none, cut on the left. */
export function alignRight(s: string, length: number): string[] {
  const chars = [...s];
  const pad = length - chars.length;
  return pad >= 0 ? [...Array<string>(pad).fill(''), ...chars] : chars.slice(-pad);
}

/**
 * Lines `prev` and `next` up from the right and says, for each character of `next`, whether it changed and which way
 * it rolls: up when the new digit is larger, down when smaller. Only a digit that replaces a digit rolls, or one that
 * appears where there was nothing, which rolls up ("9:55" to "10:05"); anything else that changes simply swaps.
 */
export function diffDigits(prev: string, next: string): DigitChange[] {
  const before = alignRight(prev, next.length);
  return [...next].map((char, i) => {
    const was = before[i];
    if (char === was) return { char, changed: false, direction: null };
    const rolls = isDigit(char) && (was === '' || isDigit(was));
    return { char, changed: true, direction: rolls ? (was === '' || char > was ? 'up' : 'down') : null };
  });
}
