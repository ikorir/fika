import { DAILY_LEAD_MIN, dailyReminderAt, dailyTrigger, oneOffReminderAt } from '@/reminders/schedule';

const at = (iso: string) => new Date(iso);

describe('dailyReminderAt', () => {
  it('is the usual departure minus the lead, on the Nairobi day of now', () => {
    expect(dailyReminderAt('08:00', at('2026-09-21T04:00:00+03:00')).toISOString()).toBe(
      at('2026-09-21T07:45:00+03:00').toISOString(),
    );
  });

  it('crosses the hour', () => {
    expect(dailyReminderAt('08:05', at('2026-09-21T04:00:00+03:00')).toISOString()).toBe(
      at('2026-09-21T07:50:00+03:00').toISOString(),
    );
  });

  it('crosses midnight backwards for a departure just after it', () => {
    expect(dailyReminderAt('00:10', at('2026-09-21T04:00:00+03:00')).toISOString()).toBe(
      at('2026-09-20T23:55:00+03:00').toISOString(),
    );
  });

  it('leads by a quarter of an hour', () => {
    expect(DAILY_LEAD_MIN).toBe(15);
  });
});

describe('dailyTrigger', () => {
  it('is that instant on the phone’s own clock, so the daily trigger fires at the Nairobi time', () => {
    const fires = at('2026-09-21T07:45:00+03:00');
    expect(dailyTrigger('08:00', at('2026-09-21T04:00:00+03:00'))).toEqual({
      hour: fires.getHours(),
      minute: fires.getMinutes(),
    });
  });
});

describe('oneOffReminderAt', () => {
  const now = at('2026-09-21T07:30:00+03:00');

  it('is nothing when the engine has no reminder time', () => {
    expect(oneOffReminderAt(null, now)).toBeNull();
  });

  it('is the reminder time while it is still ahead', () => {
    expect(oneOffReminderAt('2026-09-21T07:55:00+03:00', now)?.toISOString()).toBe(
      at('2026-09-21T07:55:00+03:00').toISOString(),
    );
  });

  it('schedules nothing in the past', () => {
    expect(oneOffReminderAt('2026-09-21T07:00:00+03:00', now)).toBeNull();
  });

  it('schedules nothing for this very minute', () => {
    expect(oneOffReminderAt('2026-09-21T07:30:00+03:00', now)).toBeNull();
  });
});
