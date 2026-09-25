// The countdown to leave-by (W11, D11). Pure: the clock is passed in.

const MIN = 60_000;

/**
 * How much of the last `windowMin` minutes before leave-by is still to go: 1 as the window opens, 0 at leave-by.
 * Null before the window, after leave-by, and with no leave-by.
 */
export function countdownFraction(now: Date | string, leaveBy: string | null, windowMin = 15): number | null {
  if (leaveBy === null) return null;
  const remainingMs = Date.parse(leaveBy) - new Date(now).getTime();
  if (remainingMs < 0 || remainingMs > windowMin * MIN) return null;
  return remainingMs / (windowMin * MIN);
}
