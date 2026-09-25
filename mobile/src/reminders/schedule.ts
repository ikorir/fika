// When the reminders fire. Pure: nothing here talks to the notification service.
import type { Commute } from '@/contract';
import { commuteDays } from '@/engine/days';
import { nairobiDate } from '@/engine/holidays';
import { nairobiTimeOnDay } from '@/time';

const MIN = 60_000;

/** How long before the usual departure the morning reminder fires. */
export const DAILY_LEAD_MIN = 15;

/** How many commute days ahead the morning reminders are scheduled for (D6). */
export const MORNING_DAYS = 7;

/** Every morning reminder's identifier starts with this, so Fika can find its own and leave every other one alone. */
export const MORNING_ID_PREFIX = 'fika.morning.';

/** The repeating reminder builds before v2 scheduled. It is one of Fika's morning reminders, to be cancelled. */
export const LEGACY_DAILY_ID = 'fika.daily-reminder';

/** Whether a scheduled notification is one of Fika's morning reminders. */
export const isMorningReminderId = (identifier: string) =>
  identifier === LEGACY_DAILY_ID || identifier.startsWith(MORNING_ID_PREFIX);

/** One morning reminder: for which commute day, when it fires, and the identifier it is scheduled under. */
export type MorningReminder = { identifier: string; at: Date; day: Date };

/** What the background task (W12) last wrote into a morning reminder: for which commute day, and the words. */
export type MorningRefresh = { date: string /* "YYYY-MM-DD", Nairobi */; body: string };

/**
 * The instant the morning reminder falls on, on the Nairobi day of `now`: the usual departure minus the lead.
 * A departure just after midnight leads back into the evening before, which is the instant that is wanted.
 */
export function dailyReminderAt(usualDeparture: string, now: Date): Date {
  return new Date(Date.parse(nairobiTimeOnDay(usualDeparture, now)) - DAILY_LEAD_MIN * MIN);
}

/**
 * The morning reminders to have pending (D6): one a commute day for the next seven, at the usual departure minus the
 * lead, leaving out any whose time has already gone by. Each is a one-off; nothing repeats.
 */
export function morningReminders(commute: Pick<Commute, 'usualDeparture' | 'quietWeekends'>, now: Date): MorningReminder[] {
  return commuteDays(commute, now, MORNING_DAYS)
    .map((day) => ({ identifier: `${MORNING_ID_PREFIX}${nairobiDate(day)}`, at: dailyReminderAt(commute.usualDeparture, day), day }))
    .filter(({ at }) => at.getTime() > now.getTime());
}

/** The one-off reminder the commuter asks for, or nothing: the engine has no reminder time, or it has gone by. */
export function oneOffReminderAt(remindAt: string | null, now: Date): Date | null {
  if (!remindAt) return null;
  const at = new Date(remindAt);
  return at.getTime() > now.getTime() ? at : null;
}
