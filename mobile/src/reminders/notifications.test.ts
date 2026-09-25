import * as Notifications from 'expo-notifications';

import {
  morningReminderPending,
  replaceMorningReminder,
  rescheduleMorningReminders,
  REMINDER_TITLE,
} from '@/reminders/notifications';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async ({ identifier }: { identifier?: string }) => identifier ?? 'generated'),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily' },
}));

const nairobi = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00+03:00`);
const pending = (...identifiers: string[]) =>
  jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValueOnce(
    identifiers.map((identifier) => ({ identifier, content: {}, trigger: null })) as never,
  );

beforeEach(() => jest.clearAllMocks());

describe('rescheduling the morning reminders', () => {
  const commute = { usualDeparture: '08:00', quietWeekends: true };

  it('cancels only Fika’s morning reminders, the old repeating one included, and schedules seven', async () => {
    pending('fika.morning.2026-09-23', 'fika.morning.2026-09-24', 'fika.daily-reminder', 'one-off-from-remind-me-at');

    await rescheduleMorningReminders(commute, nairobi('2026-09-24', '06:00'));

    const cancelled = jest.mocked(Notifications.cancelScheduledNotificationAsync).mock.calls.map(([id]) => id);
    expect(cancelled.sort()).toEqual(['fika.daily-reminder', 'fika.morning.2026-09-23', 'fika.morning.2026-09-24']);
    const scheduled = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls.map(([request]) => request);
    expect(scheduled).toHaveLength(7);
    expect(scheduled[0]).toEqual({
      identifier: 'fika.morning.2026-09-24',
      content: {
        title: REMINDER_TITLE,
        body: 'See what traffic is doing before you leave.',
        data: { reminder: 'morning', day: '2026-09-24' },
      },
      trigger: { type: 'date', channelId: 'reminders', date: nairobi('2026-09-24', '07:45') },
    });
    // One-off notifications only: nothing repeats any more.
    for (const request of scheduled) expect((request.trigger as { type: string }).type).toBe('date');
    expect(scheduled.map((r) => r.identifier)).toEqual([
      'fika.morning.2026-09-24',
      'fika.morning.2026-09-25',
      'fika.morning.2026-09-28',
      'fika.morning.2026-09-29',
      'fika.morning.2026-09-30',
      'fika.morning.2026-10-01',
      'fika.morning.2026-10-02',
    ]);
  });

  it('keeps the words the background task gave today’s reminder, and gives every other day the plain ones', async () => {
    const refreshed = { date: '2026-09-24', body: 'Leave by 7:45 today via Limuru Road.' };
    await rescheduleMorningReminders(commute, nairobi('2026-09-24', '06:00'), refreshed);
    const bodies = jest
      .mocked(Notifications.scheduleNotificationAsync)
      .mock.calls.map(([r]) => [r.identifier, r.content.body]);
    expect(bodies[0]).toEqual(['fika.morning.2026-09-24', 'Leave by 7:45 today via Limuru Road.']);
    for (const [, body] of bodies.slice(1)) expect(body).toBe('See what traffic is doing before you leave.');
  });

  it('gives every reminder the plain words when the refresh was for another morning', async () => {
    await rescheduleMorningReminders(commute, nairobi('2026-09-25', '06:00'), { date: '2026-09-24', body: 'Yesterday.' });
    const bodies = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls.map(([r]) => r.content.body);
    expect(bodies).toHaveLength(7);
    for (const body of bodies) expect(body).toBe('See what traffic is doing before you leave.');
  });

  it('cancels before it schedules, so a reminder for a day that is still wanted is not dropped', async () => {
    pending('fika.morning.2026-09-25');
    const order: string[] = [];
    jest.mocked(Notifications.cancelScheduledNotificationAsync).mockImplementation(async (id) => void order.push(`cancel ${id}`));
    jest.mocked(Notifications.scheduleNotificationAsync).mockImplementation(async ({ identifier }) => {
      order.push(`schedule ${identifier}`);
      return identifier!;
    });

    await rescheduleMorningReminders(commute, nairobi('2026-09-24', '06:00'));

    expect(order.indexOf('cancel fika.morning.2026-09-25')).toBeLessThan(order.indexOf('schedule fika.morning.2026-09-25'));
    jest.mocked(Notifications.cancelScheduledNotificationAsync).mockReset();
    jest.mocked(Notifications.scheduleNotificationAsync).mockReset();
  });

  it('runs one reschedule at a time, so the last one asked for is what stays scheduled', async () => {
    const first = rescheduleMorningReminders(commute, nairobi('2026-09-24', '06:00'));
    const second = rescheduleMorningReminders({ ...commute, usualDeparture: '07:00' }, nairobi('2026-09-24', '06:00'));
    await Promise.all([first, second]);

    const dates = jest
      .mocked(Notifications.scheduleNotificationAsync)
      .mock.calls.filter(([r]) => r.identifier === 'fika.morning.2026-09-24')
      .map(([r]) => (r.trigger as { date: Date }).date.toISOString());
    expect(dates).toEqual([nairobi('2026-09-24', '07:45').toISOString(), nairobi('2026-09-24', '06:45').toISOString()]);
  });
});

describe('today’s morning reminder, for the background task', () => {
  it('is pending only while its identifier is scheduled', async () => {
    pending('fika.morning.2026-09-24');
    await expect(morningReminderPending('fika.morning.2026-09-24')).resolves.toBe(true);
    pending('fika.morning.2026-09-25');
    await expect(morningReminderPending('fika.morning.2026-09-24')).resolves.toBe(false);
  });

  it('is replaced in place: the same identifier and time, a new body, and nothing cancelled first', async () => {
    const reminder = { identifier: 'fika.morning.2026-09-24', at: nairobi('2026-09-24', '07:45'), day: nairobi('2026-09-24', '00:00') };
    await replaceMorningReminder(reminder, 'Leave by 7:45 today via Limuru Road.');
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: 'fika.morning.2026-09-24',
      content: {
        title: REMINDER_TITLE,
        body: 'Leave by 7:45 today via Limuru Road.',
        data: { reminder: 'morning', day: '2026-09-24' },
      },
      trigger: { type: 'date', channelId: 'reminders', date: nairobi('2026-09-24', '07:45') },
    });
  });
});
