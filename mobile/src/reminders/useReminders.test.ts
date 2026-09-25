import { act, renderHook } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

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
    expect(alert).toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    alert.mockRestore();
  });
});
