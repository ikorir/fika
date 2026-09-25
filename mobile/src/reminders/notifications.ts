// The phone's local notifications: permission, the morning reminders, and the one-off one.
// Local only — there is no push token and no polling anywhere in the app. The one background task (flagged) runs when
// the OS decides, and only rewrites a morning reminder that is already scheduled.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Commute } from '@/contract';
import { nairobiDate } from '@/engine/holidays';
import {
  isMorningReminderId,
  type MorningRefresh,
  type MorningReminder,
  morningReminders,
} from '@/reminders/schedule';

const CHANNEL_ID = 'reminders';

export const REMINDER_TITLE = "Check today's commute";

/** What a morning reminder says until the background task has today's numbers, or when it never runs. */
export const MORNING_BODY = 'See what traffic is doing before you leave.';

// A reminder that arrives while the app is open still shows: the commuter asked for it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function channel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Commute reminders',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

/** Whether the phone already lets Fika notify, without asking. */
export async function notificationsAllowed(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Whether Fika can still put the system's permission question to the commuter. */
export async function canAskForNotifications(): Promise<boolean> {
  const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
  return !granted && canAskAgain;
}

/** Asks the phone for permission, and makes the Android channel the reminders go to. */
export async function askForNotifications(): Promise<boolean> {
  const granted = (await Notifications.requestPermissionsAsync()).granted;
  if (granted) await channel();
  return granted;
}

/** A morning reminder, one-off, under its own identifier: scheduling the same identifier again replaces it. */
async function scheduleMorning({ identifier, at, day }: MorningReminder, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title: REMINDER_TITLE, body, data: { reminder: 'morning', day: nairobiDate(day) } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, channelId: CHANNEL_ID, date: at },
  });
}

// One reschedule at a time, so two that overlap cannot leave the older one's times behind.
let rescheduling: Promise<void> = Promise.resolve();

/**
 * The morning reminders (D6): cancels every one of Fika's pending morning reminders — the repeating one builds before
 * v2 set included — then schedules one-offs for the next seven commute days. Notifications Fika did not schedule as a
 * morning reminder, such as "Remind me at …", are left alone. `refreshed` is what the background task last wrote: the
 * reminder for that same day, still ahead, keeps those words instead of going back to the plain ones.
 */
export function rescheduleMorningReminders(
  commute: Pick<Commute, 'usualDeparture' | 'quietWeekends'>,
  now: Date,
  refreshed: MorningRefresh | null = null,
): Promise<void> {
  const job = rescheduling.then(async () => {
    await channel();
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    for (const { identifier } of pending) {
      if (isMorningReminderId(identifier)) await Notifications.cancelScheduledNotificationAsync(identifier);
    }
    for (const reminder of morningReminders(commute, now)) {
      const kept = refreshed?.date === nairobiDate(reminder.day) ? refreshed.body : null;
      await scheduleMorning(reminder, kept ?? MORNING_BODY);
    }
  });
  rescheduling = job.catch(() => {});
  return job;
}

/** Whether a morning reminder is still waiting to go off. */
export async function morningReminderPending(identifier: string): Promise<boolean> {
  return (await Notifications.getAllScheduledNotificationsAsync()).some((r) => r.identifier === identifier);
}

/**
 * The same morning reminder at the same time with new words. Nothing is cancelled first: the identifier replaces it,
 * so if scheduling fails the reminder that was there stays.
 */
export async function replaceMorningReminder(reminder: MorningReminder, body: string): Promise<void> {
  await channel();
  await scheduleMorning(reminder, body);
}

/** The one-off reminder for today, at the instant the commuter asked for. Answers with its identifier. */
export async function scheduleOneOffReminder(at: Date, body: string): Promise<string> {
  await channel();
  return Notifications.scheduleNotificationAsync({
    content: { title: REMINDER_TITLE, body, data: { reminder: 'one-off' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, channelId: CHANNEL_ID, date: at },
  });
}

export async function cancelReminder(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

/** The reminder, now. Demo mode's cue, and what a reminder asked for after its time does. */
export async function showReminderNow(body: string): Promise<void> {
  await channel();
  await Notifications.scheduleNotificationAsync({
    content: { title: REMINDER_TITLE, body, data: { reminder: 'one-off' } },
    trigger: null,
  });
}
