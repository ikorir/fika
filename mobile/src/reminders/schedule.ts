// When the two reminders fire. Pure: nothing here talks to the notification service.
import { nairobiTimeOnDay } from '@/time';

const MIN = 60_000;

/** How long before the usual departure the daily reminder fires. */
export const DAILY_LEAD_MIN = 15;

/**
 * The instant the daily reminder falls on, on the Nairobi day of `now`: the usual departure minus the lead.
 * A departure just after midnight leads back into the evening before, which is the instant that is wanted.
 */
export function dailyReminderAt(usualDeparture: string, now: Date): Date {
  return new Date(Date.parse(nairobiTimeOnDay(usualDeparture, now)) - DAILY_LEAD_MIN * MIN);
}

/**
 * The hour and minute a repeating daily trigger fires at. expo-notifications reads a daily trigger on the phone's
 * own clock, so the Nairobi instant is converted to it: away from Nairobi the reminder still lands at the
 * commute's time of day.
 */
export function dailyTrigger(usualDeparture: string, now: Date): { hour: number; minute: number } {
  const fires = dailyReminderAt(usualDeparture, now);
  return { hour: fires.getHours(), minute: fires.getMinutes() };
}

/** The one-off reminder the commuter asks for, or nothing: the engine has no reminder time, or it has gone by. */
export function oneOffReminderAt(remindAt: string | null, now: Date): Date | null {
  if (!remindAt) return null;
  const at = new Date(remindAt);
  return at.getTime() > now.getTime() ? at : null;
}
