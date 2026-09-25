import { act, renderHook } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Alert, AppState } from 'react-native';

import * as notifications from '@/reminders/notifications';
import { useOneOffReminder } from '@/reminders/useReminders';

jest.mock('expo-notifications', () => ({ addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })) }));
jest.mock('expo-router', () => ({ router: { navigate: jest.fn() } }));
jest.mock('@/reminders/notifications', () => ({
  askForNotifications: jest.fn(async () => false),
  canAskForNotifications: jest.fn(async () => false),
  cancelReminder: jest.fn(async () => {}),
  notificationsAllowed: jest.fn(async () => true),
  scheduleDailyReminder: jest.fn(async () => {}),
  scheduleOneOffReminder: jest.fn(async () => 'reminder-1'),
  showReminderNow: jest.fn(async () => {}),
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
