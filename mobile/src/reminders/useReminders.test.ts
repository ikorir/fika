import { act, renderHook } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Alert, AppState } from 'react-native';

import { loadMorningRefresh, syncMorningReminderTask } from '@/reminders/background';
import * as notifications from '@/reminders/notifications';
import { useDailyReminder, useOneOffReminder } from '@/reminders/useReminders';

jest.mock('expo-notifications', () => ({ addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })) }));
jest.mock('expo-router', () => ({ router: { navigate: jest.fn() } }));
jest.mock('@/reminders/notifications', () => ({
  askForNotifications: jest.fn(async () => false),
  canAskForNotifications: jest.fn(async () => false),
  cancelReminder: jest.fn(async () => {}),
  notificationsAllowed: jest.fn(async () => true),
  rescheduleMorningReminders: jest.fn(async () => {}),
  scheduleOneOffReminder: jest.fn(async () => 'reminder-1'),
  showReminderNow: jest.fn(async () => {}),
}));

jest.mock('@/reminders/background', () => ({
  syncMorningReminderTask: jest.fn(async () => {}),
  loadMorningRefresh: jest.fn(async () => null),
}));

const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();

beforeEach(() => jest.clearAllMocks());

describe('the one-off reminder', () => {
  it('gives a success notification when it is set, and nothing when it is dropped', async () => {
    const { result } = await renderHook(() => useOneOffReminder(inAnHour(), 'Leave by 7:55'));

    await act(() => result.current.toggle());
    expect(result.current.set).toBe(true);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);

    await act(() => result.current.toggle());
    expect(result.current.set).toBe(false);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('stays silent when notifications are off and nothing is set', async () => {
    jest.mocked(notifications.notificationsAllowed).mockResolvedValueOnce(false);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { result } = await renderHook(() => useOneOffReminder(inAnHour(), 'Leave by 7:55'));

    await act(() => result.current.toggle());
    expect(result.current.set).toBe(false);
    // The screen says so in a card with a way to the settings (ticket 05), not in an alert.
    expect(result.current.blocked).toBe(true);
    expect(alert).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('is not blocked until the commuter asks for a reminder', async () => {
    const { result } = await renderHook(() => useOneOffReminder(inAnHour(), 'Leave by 7:55'));
    expect(result.current.blocked).toBe(false);
  });

  it('stops being blocked when the commuter comes back from the settings with notifications on', async () => {
    let wake: ((state: string) => void) | undefined;
    const listen = jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, handler: (state: string) => void) => {
      wake = handler;
      return { remove: jest.fn() };
    }) as unknown as typeof AppState.addEventListener);
    jest.mocked(notifications.notificationsAllowed).mockResolvedValueOnce(false);
    const { result } = await renderHook(() => useOneOffReminder(inAnHour(), 'Leave by 7:55'));
    await act(() => result.current.toggle());
    expect(result.current.blocked).toBe(true);

    // Back with notifications still off: still blocked.
    jest.mocked(notifications.notificationsAllowed).mockResolvedValueOnce(false);
    await act(async () => wake?.('active'));
    expect(result.current.blocked).toBe(true);

    // Back with them on: the card goes, and "Remind me at …" is there to tap again.
    await act(async () => wake?.('active'));
    expect(result.current.blocked).toBe(false);
    expect(result.current.set).toBe(false);
    listen.mockRestore();
  });
});

describe('the morning reminders', () => {
  const commute = { usualDeparture: '07:50', quietWeekends: true };
  // A test above restores its AppState spy, which leaves React Native's stand-in with no subscription to hand back.
  beforeEach(() => {
    jest.spyOn(AppState, 'addEventListener').mockImplementation((() => ({ remove: jest.fn() })) as never);
  });
  const rescheduled = () => jest.mocked(notifications.rescheduleMorningReminders).mock.calls.map(([c]) => c);

  it('are rescheduled when the app opens, and again whenever the usual departure or quiet weekends change', async () => {
    const { rerender } = await renderHook((c: typeof commute) => useDailyReminder(c), { initialProps: commute });
    await act(async () => {});
    expect(rescheduled()).toEqual([commute]);

    await rerender({ ...commute, usualDeparture: '07:30' });
    await act(async () => {});
    await rerender({ usualDeparture: '07:30', quietWeekends: false });
    await act(async () => {});
    expect(rescheduled()).toEqual([
      commute,
      { usualDeparture: '07:30', quietWeekends: true },
      { usualDeparture: '07:30', quietWeekends: false },
    ]);

    // Anything else about the commute changing leaves them be.
    await rerender({ usualDeparture: '07:30', quietWeekends: false });
    await act(async () => {});
    expect(rescheduled()).toHaveLength(3);
  });

  it('are rescheduled each time the app comes back to the front', async () => {
    let wake: ((state: string) => void) | undefined;
    const listen = jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, handler: (state: string) => void) => {
      wake = handler;
      return { remove: jest.fn() };
    }) as unknown as typeof AppState.addEventListener);
    await renderHook(() => useDailyReminder(commute));
    await act(async () => {});
    await act(async () => wake?.('active'));
    expect(rescheduled()).toHaveLength(2);
    expect(syncMorningReminderTask).toHaveBeenCalledTimes(2);
    listen.mockRestore();
  });

  it('keep the words this morning’s refresh gave today’s reminder when the app opens', async () => {
    const refreshed = { date: '2026-09-24', body: 'Leave by 7:45 today via Limuru Road.' };
    jest.mocked(loadMorningRefresh).mockResolvedValueOnce(refreshed);
    await renderHook(() => useDailyReminder(commute));
    await act(async () => {});
    expect(jest.mocked(notifications.rescheduleMorningReminders).mock.calls[0][2]).toEqual(refreshed);
  });

  it('are not scheduled while the phone will not let Fika notify', async () => {
    jest.mocked(notifications.notificationsAllowed).mockResolvedValueOnce(false);
    await renderHook(() => useDailyReminder(commute));
    await act(async () => {});
    expect(notifications.rescheduleMorningReminders).not.toHaveBeenCalled();
  });

  it('register or unregister the background task by its flag when the app opens', async () => {
    await renderHook(() => useDailyReminder(commute));
    await act(async () => {});
    expect(syncMorningReminderTask).toHaveBeenCalledTimes(1);
  });
});
