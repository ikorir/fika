import { formatTime, nairobiTimeOnDay } from '@/time';

describe('Nairobi times', () => {
  it('formats an instant as Nairobi wall-clock time', () => {
    expect(formatTime('2026-09-21T05:05:00Z')).toBe('8:05');
    expect(formatTime('2026-09-21T14:30:00Z')).toBe('17:30');
  });

  it('places an "HH:mm" on the Nairobi day of now, even when UTC is still on the day before', () => {
    expect(nairobiTimeOnDay('09:00', new Date('2026-09-20T22:30:00Z'))).toBe('2026-09-21T09:00:00+03:00');
  });
});
