import { commuteDeadline, formatClock, formatTime, nairobiTimeOnDay } from '@/time';

describe('Nairobi times', () => {
  it('formats an instant as Nairobi wall-clock time', () => {
    expect(formatTime('2026-09-21T05:05:00Z')).toBe('8:05');
    expect(formatTime('2026-09-21T14:30:00Z')).toBe('17:30');
  });

  it('formats a stored "HH:mm" the same way', () => {
    expect(formatClock('09:00')).toBe('9:00');
    expect(formatClock('17:30')).toBe('17:30');
  });

  it('places an "HH:mm" on the Nairobi day of now, even when UTC is still on the day before', () => {
    expect(nairobiTimeOnDay('09:00', new Date('2026-09-20T22:30:00Z'))).toBe('2026-09-21T09:00:00+03:00');
  });

  it("keeps today's deadline until two hours after it, then moves to tomorrow's", () => {
    expect(commuteDeadline('09:00', new Date('2026-09-21T07:59:00+03:00'))).toBe('2026-09-21T09:00:00+03:00');
    expect(commuteDeadline('09:00', new Date('2026-09-21T11:00:00+03:00'))).toBe('2026-09-21T09:00:00+03:00');
    expect(commuteDeadline('09:00', new Date('2026-09-21T11:01:00+03:00'))).toBe('2026-09-22T09:00:00+03:00');
    expect(commuteDeadline('09:00', new Date('2026-09-21T22:30:00+03:00'))).toBe('2026-09-22T09:00:00+03:00');
  });
});
