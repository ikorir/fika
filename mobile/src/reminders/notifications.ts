// The phone's local notifications: permission, the repeating daily reminder, and the one-off one.
// Local only — there is no push token and no background polling anywhere in the app.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { dailyTrigger } from '@/reminders/schedule';

/** The daily reminder keeps one identifier, so rescheduling replaces it instead of piling up. */
const DAILY_ID = 'fika.daily-reminder';
const CHANNEL_ID = 'reminders';

export const REMINDER_TITLE = "Check today's commute";

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

/** The repeating reminder, a fixed lead before the usual departure. Replaces whatever was scheduled before. */
export async function scheduleDailyReminder(usualDeparture: string, now: Date): Promise<void> {
  await channel();
  await cancelDailyReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_ID,
    content: {
      title: REMINDER_TITLE,
      body: 'See what traffic is doing before you leave.',
      data: { reminder: 'daily' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId: CHANNEL_ID,
      ...dailyTrigger(usualDeparture, now),
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => {});
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
