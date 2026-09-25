// The morning reminder with today's numbers (W12), behind `flag('backgroundReminder')`. An opportunistic background
// task: the OS decides when, or whether, it runs; nothing polls. The first run inside the 90 minutes before a commute
// day's morning reminder fetches that day's routes, once, and rewrites the reminder's words; `fika.morning-refresh`
// remembers it, so later runs that morning fetch nothing. When it never runs, the reminder says what it always says.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { fetchRoutes } from '@/api';
import { loadCommute } from '@/commute';
import type { Commute, RoutesRequest, RoutesResponse } from '@/contract';
import { evaluate } from '@/engine';
import { effectiveCommute } from '@/engine/effective';
import { nairobiDate } from '@/engine/holidays';
import { flag } from '@/flags';
import { morningReminderPending, replaceMorningReminder } from '@/reminders/notifications';
import { type MorningRefresh, type MorningReminder, morningReminders } from '@/reminders/schedule';
import { routesRequest } from '@/today/useRoutes';
import { morningBody } from '@/today/words';

/** The task's name with the OS. */
export const MORNING_TASK = 'fika.morning-reminder';

/** How long before today's morning reminder a run of the task may rewrite it. */
export const REFRESH_WINDOW_MIN = 90;

/** The shortest interval the OS accepts, in minutes. It treats it as a minimum and runs the task when it chooses. */
export const MINIMUM_INTERVAL_MIN = 15;

/** The one AsyncStorage key the record of the last refresh lives under, as `{ version: 1, date, body }`. */
export const MORNING_REFRESH_KEY = 'fika.morning-refresh';

const MIN = 60_000;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** The last refresh the task made, or nothing: none yet, or a record that cannot be read. */
export async function loadMorningRefresh(): Promise<MorningRefresh | null> {
  try {
    const stored = await AsyncStorage.getItem(MORNING_REFRESH_KEY);
    const v: unknown = stored === null ? null : JSON.parse(stored);
    return isObject(v) && typeof v.date === 'string' && typeof v.body === 'string' ? { date: v.date, body: v.body } : null;
  } catch {
    return null;
  }
}

/** Remembers a refresh, replacing the one before: only the latest morning's is ever needed. */
export async function saveMorningRefresh({ date, body }: MorningRefresh): Promise<void> {
  await AsyncStorage.setItem(MORNING_REFRESH_KEY, JSON.stringify({ version: 1, date, body }));
}

/** Everything the task body touches, passed in so it can run against a fake clock, network and notifications. */
export type RefreshDeps = {
  enabled: () => Promise<boolean>;
  commute: () => Promise<Commute>;
  now: () => Date;
  fetchRoutes: (request: RoutesRequest) => Promise<RoutesResponse>;
  scheduler: {
    isPending: (identifier: string) => Promise<boolean>;
    replace: (reminder: MorningReminder, body: string) => Promise<void>;
  };
  /** The record of the last refresh (`fika.morning-refresh`), so a morning is fetched for at most once. */
  record: { read: () => Promise<MorningRefresh | null>; write: (refresh: MorningRefresh) => Promise<void> };
};

/** Rewritten, nothing to do (a success), or a failure that left the reminder as it was. */
export type RefreshOutcome = 'refreshed' | 'skipped' | 'failed';

/**
 * One run of the task. With the flag on, on a commute day, inside the 90 minutes before that day's morning reminder,
 * with that reminder still pending and not yet refreshed: fetch routes for the day's effective commute through the
 * app's own API client, evaluate them with the engine, record the refresh, and replace the reminder with one at the
 * same time that says what they show. Anything else does nothing. Any failure leaves the pending reminder exactly as
 * it was, and records nothing, so a later run that morning may try again; a refresh that worked is never repeated.
 */
export async function refreshMorningReminder(deps: RefreshDeps): Promise<RefreshOutcome> {
  try {
    if (!(await deps.enabled())) return 'skipped';
    const commute = await deps.commute();
    const now = deps.now();
    // The next reminder still ahead is on a commute day by construction; weekends when quiet and holidays have none.
    const [next] = morningReminders(commute, now);
    if (!next || next.at.getTime() - now.getTime() > REFRESH_WINDOW_MIN * MIN) return 'skipped';
    // One billed fetch a morning (SPEC "v2 amendments"): this one has already been refreshed.
    const date = nairobiDate(next.day);
    if ((await deps.record.read())?.date === date) return 'skipped';
    // No reminder waiting (notifications off, or already gone): nothing to rewrite, so nothing worth a billed fetch.
    if (!(await deps.scheduler.isPending(next.identifier))) return 'skipped';

    const today = effectiveCommute(commute, { date: next.day, direction: 'work' });
    const { samples } = await deps.fetchRoutes(routesRequest(today, now));
    const body = morningBody(evaluate({ commute: today, samples, now }));
    // Recorded before the reminder is rewritten: should the rewrite fail, opening the app puts these words in (the
    // reschedule keeps them), and no second fetch is made for this morning.
    await deps.record.write({ date, body });
    await deps.scheduler.replace(next, body);
    return 'refreshed';
  } catch {
    return 'failed';
  }
}

/**
 * Defines the task with the OS's task manager. Called once by the bundle entry (`mobile/index.ts`), before the router,
 * so the task exists whenever the OS starts the app in the background to run it, with no screen rendered.
 */
export function defineMorningReminderTask() {
  TaskManager.defineTask(MORNING_TASK, async () => {
    const outcome = await refreshMorningReminder({
      enabled: () => flag('backgroundReminder'),
      commute: loadCommute,
      now: () => new Date(),
      fetchRoutes,
      scheduler: { isPending: morningReminderPending, replace: replaceMorningReminder },
      record: { read: loadMorningRefresh, write: saveMorningRefresh },
    });
    return outcome === 'failed' ? BackgroundTask.BackgroundTaskResult.Failed : BackgroundTask.BackgroundTaskResult.Success;
  });
}

/**
 * Registers the task, at the minimum interval, while the flag is on; unregisters it when it is off. Where the OS has
 * nowhere to run it (the iOS simulator, Expo Go) it is left unregistered, quietly: the library's own warning would
 * put a LogBox toast over the Today screen in a dev build.
 */
export async function syncMorningReminderTask(): Promise<void> {
  if (!(await flag('backgroundReminder'))) {
    await BackgroundTask.unregisterTaskAsync(MORNING_TASK);
    if (__DEV__) console.log(`Fika: ${MORNING_TASK} unregistered (flag off)`);
    return;
  }
  if ((await BackgroundTask.getStatusAsync()) !== BackgroundTask.BackgroundTaskStatus.Available) {
    if (__DEV__) console.log(`Fika: ${MORNING_TASK} not registered (background tasks unavailable here)`);
    return;
  }
  await BackgroundTask.registerTaskAsync(MORNING_TASK, { minimumInterval: MINIMUM_INTERVAL_MIN });
  if (__DEV__) console.log(`Fika: ${MORNING_TASK} registered, minimum interval ${MINIMUM_INTERVAL_MIN} min`);
}
