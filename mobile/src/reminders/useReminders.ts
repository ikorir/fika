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
 * Whether Fika may notify. The phone's own permission dialog carries no reason, so Fika says what the reminders
 * are for first — once per run of the app, and never once the phone has stopped offering the question.
 */
async function allowedToNotify(): Promise<boolean> {
  if (await notificationsAllowed()) return true;
  if (askedThisSession || !(await canAskForNotifications())) return false;
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
      if ((await allowedToNotify()) && live) await scheduleDailyReminder(usualDeparture, new Date());
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
  // `id` is null for a reminder that was shown straight away, which there is nothing to cancel.
  const [scheduled, setScheduled] = useState<{ at: string; id: string | null } | null>(null);

  const toggle = useCallback(async () => {
    if (scheduled) {
      if (scheduled.id) await cancelReminder(scheduled.id);
      setScheduled(null);
      return;
    }
    if (!at) return;
    if (!(await allowedToNotify())) {
      Alert.alert('Reminders are off', 'Turn on notifications for Fika in your phone’s settings to be reminded.');
      return;
    }
    // In Demo mode the app clock can be ahead of the phone's, so the time asked for may already have gone by.
    const when = oneOffReminderAt(at, new Date());
    if (!when) {
      await showReminderNow(body);
      setScheduled({ at, id: null });
      return;
    }
    setScheduled({ at, id: await scheduleOneOffReminder(when, body) });
  }, [at, body, scheduled]);

  // Traffic moves leave-by, so a reminder already asked for moves with it, and goes when there is no leave-by left.
  useEffect(() => {
    if (!scheduled || scheduled.at === at) return;
    let live = true;
    (async () => {
      if (scheduled.id) await cancelReminder(scheduled.id);
      const when = at === null ? null : oneOffReminderAt(at, new Date());
      if (!live) return;
      if (at === null || when === null) return setScheduled(null);
      const id = await scheduleOneOffReminder(when, body);
      if (live) setScheduled({ at, id });
    })();
    return () => {
      live = false;
    };
  }, [at, body, scheduled]);

  return { at, set: scheduled !== null, toggle };
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
