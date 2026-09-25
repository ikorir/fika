import {
  DAILY_LEAD_MIN,
  dailyReminderAt,
  isMorningReminderId,
  morningReminders,
  oneOffReminderAt,
} from '@/reminders/schedule';

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

describe('morningReminders', () => {
  const quiet = { usualDeparture: '08:00', quietWeekends: true };
  const nairobi = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00+03:00`);
  const when = (reminders: { identifier: string; at: Date }[]) =>
    reminders.map(({ identifier, at }) => [identifier, at.toISOString()]);

  it('is one reminder a commute day for the next seven, at the usual departure minus the lead', () => {
    // Thursday 24 September 2026, before the reminder: Thu, Fri, then Mon to Fri, over the weekend and a month end.
    expect(when(morningReminders(quiet, nairobi('2026-09-24', '06:00')))).toEqual(
      ['2026-09-24', '2026-09-25', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'].map((day) => [
        `fika.morning.${day}`,
        nairobi(day, '07:45').toISOString(),
      ]),
    );
  });

  it('skips today once today’s has gone by', () => {
    const reminders = morningReminders(quiet, nairobi('2026-09-24', '07:45'));
    expect(reminders).toHaveLength(6);
    expect(reminders[0].identifier).toBe('fika.morning.2026-09-25');
  });

  it('includes the weekend when weekends are not quiet', () => {
    const reminders = morningReminders({ ...quiet, quietWeekends: false }, nairobi('2026-09-24', '06:00'));
    expect(reminders.map((r) => r.identifier)).toContain('fika.morning.2026-09-26');
    expect(reminders).toHaveLength(7);
  });

  it('names the commute day each one is for', () => {
    const [first] = morningReminders(quiet, nairobi('2026-09-24', '06:00'));
    expect(first.day.toISOString()).toBe(nairobi('2026-09-24', '00:00').toISOString());
  });
});

describe('isMorningReminderId', () => {
  it('is Fika’s own morning reminders, and the repeating one older builds set, and nothing else', () => {
    expect(isMorningReminderId('fika.morning.2026-09-24')).toBe(true);
    expect(isMorningReminderId('fika.daily-reminder')).toBe(true);
    expect(isMorningReminderId('6F9619FF-8B86-D011-B42D-00C04FC964FF')).toBe(false);
    expect(isMorningReminderId('fika.morningish')).toBe(false);
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
