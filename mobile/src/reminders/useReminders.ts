// The reminders as the screen uses them: the daily one, the one the commuter asks for, Demo mode's cue, and the
// refresh that follows waking the app or tapping a reminder.
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';

import type { Evaluation } from '@/contract';
import {
  askForNotifications,
  canAskForNotifications,
  cancelReminder,
  notificationsAllowed,
  scheduleDailyReminder,
  scheduleOneOffReminder,
  showReminderNow,
} from '@/reminders/notifications';
import { DAILY_LEAD_MIN, oneOffReminderAt } from '@/reminders/schedule';
import { reminderSet } from '@/ui/haptics';

let askedThisSession = false;

const confirm = (title: string, message: string) =>
  new Promise<boolean>((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Remind me', onPress: () => resolve(true) },
      ],
      { onDismiss: () => resolve(false) },
    );
  });

/**
 * Whether Fika may notify. Unasked, on the first run, the phone's own dialog carries no reason, so Fika says what
 * the reminders are for first — once per run of the app. Tapping "Remind me at 7:55" is the reason itself, so that
 * goes straight to the phone's question however the first one was answered.
 */
async function allowedToNotify(asked: boolean): Promise<boolean> {
  if (await notificationsAllowed()) return true;
  if (!(await canAskForNotifications())) return false;
  if (asked) return askForNotifications();
  if (askedThisSession) return false;
  askedThisSession = true;
  const yes = await confirm(
    'Remind you before you leave?',
    `Fika sends one reminder ${DAILY_LEAD_MIN} minutes before your usual departure, and another only when you ask for it. Nothing else.`,
  );
  return yes ? askForNotifications() : false;
}

/** The repeating daily reminder. Scheduled on the first run, and moved whenever the usual departure changes. */
export function useDailyReminder(usualDeparture: string) {
  useEffect(() => {
    let live = true;
    (async () => {
      if ((await allowedToNotify(false)) && live) await scheduleDailyReminder(usualDeparture, new Date());
    })();
    return () => {
      live = false;
    };
  }, [usualDeparture]);
}

/** Fresh data whenever the app comes back to the front or a reminder is tapped. There is no polling in between. */
export function useRefreshOnWake(refresh: () => void) {
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const woke = AppState.addEventListener('change', (state) => {
      if (state === 'active') latest.current();
    });
    // A tapped reminder is about today's commute, so the screen comes forward with numbers fetched just now.
    const tapped = Notifications.addNotificationResponseReceivedListener(() => {
      router.navigate('/');
      latest.current();
    });
    return () => {
      woke.remove();
      tapped.remove();
    };
  }, []);
}

/** The one-off reminder behind "Remind me at 7:55": `set` once it is scheduled, and `toggle` to set or drop it. */
export type Reminder = { at: string | null; set: boolean; toggle: () => void };

export function useOneOffReminder(at: string | null, body: string): Reminder {
  const [set, setSet] = useState(false);
  // Refs, not state: what is armed on the phone has to be right even between renders, or an identifier is lost and
  // the notification behind it can never be cancelled.
  const wanted = useRef(false);
  const armed = useRef<string | null>(null);
  const words = useRef(body);
  useEffect(() => {
    words.current = body;
  }, [body]);

  // One job at a time, so two taps or a moved leave-by can never leave two reminders armed.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const run = (job: () => Promise<void>) => {
    queue.current = queue.current.then(job).catch(() => {});
    return queue.current;
  };

  const disarm = () =>
    run(async () => {
      if (armed.current) await cancelReminder(armed.current);
      armed.current = null;
    });

  const arm = (when: Date) =>
    run(async () => {
      if (armed.current) await cancelReminder(armed.current);
      armed.current = await scheduleOneOffReminder(when, words.current);
    });

  const toggle = useCallback(async () => {
    if (wanted.current) {
      wanted.current = false;
      setSet(false);
      disarm();
      return;
    }
    if (!at) return;
    if (!(await allowedToNotify(true))) {
      Alert.alert('Reminders are off', 'Turn on notifications for Fika in your phone’s settings to be reminded.');
      return;
    }
    wanted.current = true;
    setSet(true);
    reminderSet();
    // In Demo mode the app clock can be ahead of the phone's, so the time asked for may already have gone by.
    const when = oneOffReminderAt(at, new Date());
    if (when) arm(when);
    else run(() => showReminderNow(words.current));
  }, [at]);

  // Traffic moves leave-by, so a reminder already asked for moves with it, and goes when there is no leave-by left.
  useEffect(() => {
    if (!wanted.current) return;
    const when = at === null ? null : oneOffReminderAt(at, new Date());
    if (when === null) {
      wanted.current = false;
      setSet(false);
      disarm();
      return;
    }
    arm(when);
  }, [at]);

  return { at, set, toggle };
}

/**
 * Demo mode's cue: stepping the app clock past the reminder time shows the reminder, so the presenter can bring it
 * up on the spot. Live, that is the phone's own scheduled notification and nothing here fires.
 */
export function useDemoReminderCue(evaluation: Evaluation | undefined, on: boolean, body: string) {
  const due = useRef<string | null>(null);
  const shown = useRef<string | null>(null);

  useEffect(() => {
    if (!on || !evaluation) {
      due.current = null;
      return;
    }
    // While the engine still names a reminder time it is ahead of the app clock; remember it until it is crossed.
    if (evaluation.remindAt) {
      due.current = evaluation.remindAt;
      return;
    }
    const at = due.current;
    if (!at || shown.current === at || Date.parse(evaluation.now) < Date.parse(at)) return;
    shown.current = at;
    showReminderNow(body);
  }, [on, evaluation, body]);
}
