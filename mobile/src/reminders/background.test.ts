import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import type { Commute, Route, RoutesRequest, RoutesResponse } from '@/contract';
import { FLAGS_KEY } from '@/flags';
import {
  defineMorningReminderTask,
  loadMorningRefresh,
  MORNING_REFRESH_KEY,
  MORNING_TASK,
  refreshMorningReminder,
  type RefreshDeps,
  saveMorningRefresh,
  syncMorningReminderTask,
} from '@/reminders/background';
import type { MorningRefresh, MorningReminder } from '@/reminders/schedule';
import { seedCommute } from '@/seed';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: require('../../app.json').expo } }));
jest.mock('expo-background-task', () => ({
  getStatusAsync: jest.fn(async () => 2),
  registerTaskAsync: jest.fn(async () => {}),
  unregisterTaskAsync: jest.fn(async () => {}),
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
}));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('@/reminders/notifications', () => ({
  morningReminderPending: jest.fn(async () => true),
  replaceMorningReminder: jest.fn(async () => {}),
}));
jest.mock('@/api', () => ({ fetchRoutes: jest.fn() }));

const MIN = 60_000;
const nairobi = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00+03:00`);

// The seeded commute: usual departure 7:50, so the morning reminder is at 7:35; arrive by 9:00, buffer 10, extra 10.
const commute: Commute = { ...seedCommute, arriveByByDay: { fri: '08:30' } };

const limuru = (min: number): Route => ({
  id: 'limuru-road',
  label: 'via Limuru Road',
  durationSec: min * 60,
  staticDurationSec: 35 * 60,
  distanceM: 18_000,
  polyline: '',
});
/** Samples every 10 minutes from `from`, each with a 40 minute drive on Limuru Road. */
const routesFrom = (from: Date): RoutesResponse => ({
  fetchedAt: from.toISOString(),
  samples: Array.from({ length: 12 }, (_, i) => ({
    departAt: new Date(from.getTime() + i * 10 * MIN).toISOString(),
    kind: i === 0 ? ('now' as const) : ('step' as const),
    routes: [limuru(40)],
  })),
});

/** The record of this morning's refresh, kept in memory the way `fika.morning-refresh` keeps it on the phone. */
function memoryRecord(start: MorningRefresh | null = null) {
  let kept = start;
  return {
    read: jest.fn(async () => kept),
    write: jest.fn(async (r: MorningRefresh) => void (kept = r)),
  };
}

function deps(now: Date, over: Partial<RefreshDeps> = {}) {
  const scheduler = {
    isPending: jest.fn(async (_: string) => true),
    replace: jest.fn(async (_reminder: MorningReminder, _body: string) => {}),
  };
  const fetchRoutes = jest.fn(async (_: RoutesRequest) => routesFrom(now));
  const all: RefreshDeps = {
    enabled: async () => true,
    commute: async () => commute,
    now: () => now,
    fetchRoutes,
    scheduler,
    record: memoryRecord(),
    ...over,
  };
  return {
    ...all,
    fetchRoutes: all.fetchRoutes as typeof fetchRoutes,
    scheduler: all.scheduler as typeof scheduler,
    record: all.record as ReturnType<typeof memoryRecord>,
  };
}

beforeEach(() => jest.clearAllMocks());
// The task logs its registration in a dev build, for the device check; the tests do not need to hear it.
beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => jest.mocked(console.log).mockRestore());

describe('refreshMorningReminder, the background task’s body', () => {
  it('inside the 90 minutes before today’s reminder, replaces it with one at the same time and today’s numbers', async () => {
    const d = deps(nairobi('2026-09-24', '06:30')); // Thursday, 65 minutes before 7:35
    await expect(refreshMorningReminder(d)).resolves.toBe('refreshed');

    expect(d.fetchRoutes).toHaveBeenCalledTimes(1);
    expect(d.scheduler.isPending).toHaveBeenCalledWith('fika.morning.2026-09-24');
    expect(d.scheduler.replace).toHaveBeenCalledTimes(1);
    const [reminder, body] = d.scheduler.replace.mock.calls[0];
    expect(reminder.identifier).toBe('fika.morning.2026-09-24');
    expect(reminder.at.toISOString()).toBe(nairobi('2026-09-24', '07:35').toISOString());
    // 40 min + 10 extra from 8:00 is 8:50, the last arrival inside the buffer before 9:00.
    expect(body).toBe('Leave by 8:00 today via Limuru Road.');
  });

  it('fetches routes for the day’s effective commute, as the Today screen would', async () => {
    const now = nairobi('2026-09-25', '06:30'); // Friday: arrive by 8:30
    const d = deps(now);
    await refreshMorningReminder(d);
    expect(d.fetchRoutes).toHaveBeenCalledWith({
      origin: commute.origin.location,
      destination: commute.destination.location,
      arriveBy: '2026-09-25T08:30:00+03:00',
      usualDeparture: '2026-09-25T07:50:00+03:00',
    });
    expect(d.scheduler.replace.mock.calls[0][1]).toBe('Leave by 7:30 today via Limuru Road.');
  });

  it('starts at 90 minutes before the reminder and stops at the reminder', async () => {
    await expect(refreshMorningReminder(deps(nairobi('2026-09-24', '06:05')))).resolves.toBe('refreshed');
    await expect(refreshMorningReminder(deps(nairobi('2026-09-24', '07:34')))).resolves.toBe('refreshed');
  });

  it.each([
    ['earlier than 90 minutes before', nairobi('2026-09-24', '06:04')],
    ['once the reminder has gone off', nairobi('2026-09-24', '07:35')],
    ['on a quiet Saturday', nairobi('2026-09-26', '06:30')],
    ['on a public holiday', nairobi('2026-12-25', '06:30')],
  ])('does nothing %s', async (_, now) => {
    const d = deps(now);
    await expect(refreshMorningReminder(d)).resolves.toBe('skipped');
    expect(d.fetchRoutes).not.toHaveBeenCalled();
    expect(d.scheduler.replace).not.toHaveBeenCalled();
  });

  it('does nothing, and reads nothing, with the flag off', async () => {
    const commuteRead = jest.fn(async () => commute);
    const d = deps(nairobi('2026-09-24', '06:30'), { enabled: async () => false, commute: commuteRead });
    await expect(refreshMorningReminder(d)).resolves.toBe('skipped');
    expect(commuteRead).not.toHaveBeenCalled();
    expect(d.fetchRoutes).not.toHaveBeenCalled();
    expect(d.scheduler.replace).not.toHaveBeenCalled();
  });

  it('does not fetch when there is no reminder pending to refresh', async () => {
    const d = deps(nairobi('2026-09-24', '06:30'));
    d.scheduler.isPending.mockResolvedValueOnce(false);
    await expect(refreshMorningReminder(d)).resolves.toBe('skipped');
    expect(d.fetchRoutes).not.toHaveBeenCalled();
  });

  it('leaves the reminder untouched when the fetch fails', async () => {
    const d = deps(nairobi('2026-09-24', '06:30'));
    d.fetchRoutes.mockRejectedValueOnce(new Error('Network request failed'));
    await expect(refreshMorningReminder(d)).resolves.toBe('failed');
    expect(d.scheduler.replace).not.toHaveBeenCalled();
  });

  it('leaves the reminder untouched when there is no route to evaluate', async () => {
    const now = nairobi('2026-09-24', '06:30');
    const empty = routesFrom(now);
    const d = deps(now, { fetchRoutes: async () => ({ ...empty, samples: empty.samples.map((s) => ({ ...s, routes: [] })) }) });
    await expect(refreshMorningReminder(d)).resolves.toBe('failed');
    expect(d.scheduler.replace).not.toHaveBeenCalled();
  });

  it('reports a failure to replace, having cancelled nothing', async () => {
    const d = deps(nairobi('2026-09-24', '06:30'));
    d.scheduler.replace.mockRejectedValueOnce(new Error('Notifications unavailable'));
    await expect(refreshMorningReminder(d)).resolves.toBe('failed');
  });
});

describe('refreshMorningReminder, one billed fetch a morning', () => {
  it('records the refresh for the day, and does not fetch again that morning', async () => {
    const record = memoryRecord();
    const first = deps(nairobi('2026-09-24', '06:30'), { record });
    await expect(refreshMorningReminder(first)).resolves.toBe('refreshed');
    expect(record.write).toHaveBeenCalledWith({ date: '2026-09-24', body: 'Leave by 8:00 today via Limuru Road.' });

    for (const hhmm of ['06:45', '07:00', '07:15', '07:30']) {
      const later = deps(nairobi('2026-09-24', hhmm), { record });
      await expect(refreshMorningReminder(later)).resolves.toBe('skipped');
      expect(later.fetchRoutes).not.toHaveBeenCalled();
      expect(later.scheduler.replace).not.toHaveBeenCalled();
    }
  });

  it('tries again on a later run when the fetch failed, and records nothing until one works', async () => {
    const record = memoryRecord();
    const failing = deps(nairobi('2026-09-24', '06:30'), { record });
    failing.fetchRoutes.mockRejectedValueOnce(new Error('Network request failed'));
    await expect(refreshMorningReminder(failing)).resolves.toBe('failed');
    expect(record.write).not.toHaveBeenCalled();

    const retry = deps(nairobi('2026-09-24', '06:45'), { record });
    await expect(refreshMorningReminder(retry)).resolves.toBe('refreshed');
    expect(retry.fetchRoutes).toHaveBeenCalledTimes(1);
  });

  it('is not held back by the record of another morning', async () => {
    const d = deps(nairobi('2026-09-25', '06:30'), { record: memoryRecord({ date: '2026-09-24', body: 'Yesterday.' }) });
    await expect(refreshMorningReminder(d)).resolves.toBe('refreshed');
    expect(d.fetchRoutes).toHaveBeenCalledTimes(1);
  });

  it('leaves the reminder untouched when the record cannot be written, and may try again', async () => {
    const d = deps(nairobi('2026-09-24', '06:30'));
    d.record.write.mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(refreshMorningReminder(d)).resolves.toBe('failed');
    expect(d.scheduler.replace).not.toHaveBeenCalled();
  });
});

describe('the morning refresh record', () => {
  beforeEach(() => AsyncStorage.clear());

  it('lives under fika.morning-refresh, versioned, and reads back as it was written', async () => {
    expect(MORNING_REFRESH_KEY).toBe('fika.morning-refresh');
    await saveMorningRefresh({ date: '2026-09-24', body: 'Leave by 8:00 today via Limuru Road.' });
    expect(JSON.parse((await AsyncStorage.getItem(MORNING_REFRESH_KEY))!)).toEqual({
      version: 1,
      date: '2026-09-24',
      body: 'Leave by 8:00 today via Limuru Road.',
    });
    await expect(loadMorningRefresh()).resolves.toEqual({ date: '2026-09-24', body: 'Leave by 8:00 today via Limuru Road.' });
  });

  it('is nothing when there is none, or it cannot be read', async () => {
    await expect(loadMorningRefresh()).resolves.toBeNull();
    await AsyncStorage.setItem(MORNING_REFRESH_KEY, '{"date":');
    await expect(loadMorningRefresh()).resolves.toBeNull();
    await AsyncStorage.setItem(MORNING_REFRESH_KEY, JSON.stringify({ version: 1, date: 20260924 }));
    await expect(loadMorningRefresh()).resolves.toBeNull();
  });
});

describe('the background task', () => {
  const executor = () => {
    defineMorningReminderTask();
    expect(TaskManager.defineTask).toHaveBeenCalledWith(MORNING_TASK, expect.any(Function));
    return jest.mocked(TaskManager.defineTask).mock.calls[0][1] as () => Promise<number>;
  };

  beforeEach(() => AsyncStorage.clear());

  it('succeeds without doing anything when the flag is off on this phone', async () => {
    await AsyncStorage.setItem(FLAGS_KEY, JSON.stringify({ version: 1, flags: { backgroundReminder: false } }));
    await expect(executor()()).resolves.toBe(BackgroundTask.BackgroundTaskResult.Success);
    const { fetchRoutes } = jest.requireMock('@/api');
    expect(fetchRoutes).not.toHaveBeenCalled();
  });

  it('is registered with the minimum interval when the flag is on, and unregistered when it is off', async () => {
    await syncMorningReminderTask();
    expect(BackgroundTask.registerTaskAsync).toHaveBeenCalledWith(MORNING_TASK, { minimumInterval: 15 });
    expect(BackgroundTask.unregisterTaskAsync).not.toHaveBeenCalled();

    await AsyncStorage.setItem(FLAGS_KEY, JSON.stringify({ version: 1, flags: { backgroundReminder: false } }));
    await syncMorningReminderTask();
    expect(BackgroundTask.unregisterTaskAsync).toHaveBeenCalledWith(MORNING_TASK);
    expect(BackgroundTask.registerTaskAsync).toHaveBeenCalledTimes(1);
  });

  it('is left unregistered, without the library’s warning, where the OS cannot run it (the iOS simulator)', async () => {
    jest.mocked(BackgroundTask.getStatusAsync).mockResolvedValueOnce(BackgroundTask.BackgroundTaskStatus.Restricted);
    await syncMorningReminderTask();
    expect(BackgroundTask.registerTaskAsync).not.toHaveBeenCalled();
  });
});
