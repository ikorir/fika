import type { Commute } from '@/contract';
import { commuteDayAt, effectiveCommute } from '@/engine/effective';
import { seedCommute } from '@/seed';

const at = (iso: string) => new Date(iso);
const nairobi = (day: string, hhmm = '00:00') => new Date(`${day}T${hhmm}:00+03:00`);

// Arrive by 9:00, except 8:30 on Fridays and 10:00 on Mondays.
const commute: Commute = { ...seedCommute, arriveBy: '09:00', arriveByByDay: { fri: '08:30', mon: '10:00' } };

describe('effectiveCommute, to work', () => {
  it.each([
    ['2026-09-21', 'Monday', '10:00'],
    ['2026-09-22', 'Tuesday', '09:00'],
    ['2026-09-23', 'Wednesday', '09:00'],
    ['2026-09-24', 'Thursday', '09:00'],
    ['2026-09-25', 'Friday', '08:30'],
    ['2026-09-26', 'Saturday', '09:00'],
    ['2026-09-27', 'Sunday', '09:00'],
  ])('on %s (%s) arrives by %s', (day, _name, arriveBy) => {
    expect(effectiveCommute(commute, { date: nairobi(day, '07:00'), direction: 'work' }).arriveBy).toBe(arriveBy);
  });

  it('changes nothing else about the commute', () => {
    const friday = effectiveCommute(commute, { date: nairobi('2026-09-25'), direction: 'work' });
    expect(friday).toEqual({ ...commute, arriveBy: '08:30' });
  });

  it('is the very same commute on a day with no arrive-by of its own, so nothing downstream sees a change', () => {
    expect(effectiveCommute(commute, { date: nairobi('2026-09-22'), direction: 'work' })).toBe(commute);
    expect(effectiveCommute(seedCommute, { date: nairobi('2026-09-25'), direction: 'work' })).toBe(seedCommute);
  });

  it('reads the weekday on the Nairobi calendar, not the phone’s', () => {
    // 20:59 UTC Thursday is 23:59 Thursday in Nairobi; 21:00 UTC is already Friday there.
    expect(effectiveCommute(commute, { date: at('2026-09-24T20:59:00Z'), direction: 'work' }).arriveBy).toBe('09:00');
    expect(effectiveCommute(commute, { date: at('2026-09-24T21:00:00Z'), direction: 'work' }).arriveBy).toBe('08:30');
  });

  it('does not do the trip home yet (ticket 08)', () => {
    expect(() => effectiveCommute(commute, { date: nairobi('2026-09-25'), direction: 'home' })).toThrow(/not yet/);
  });
});

describe('commuteDayAt, the day the Today screen is about', () => {
  const day = (d: Date) => d.toISOString();

  it('is today until two hours past today’s deadline, then tomorrow', () => {
    expect(day(commuteDayAt(seedCommute, nairobi('2026-09-22', '07:00')))).toBe(day(nairobi('2026-09-22')));
    expect(day(commuteDayAt(seedCommute, nairobi('2026-09-22', '11:00')))).toBe(day(nairobi('2026-09-22')));
    expect(day(commuteDayAt(seedCommute, nairobi('2026-09-22', '11:01')))).toBe(day(nairobi('2026-09-23')));
  });

  it('uses the day’s own arrive-by for that deadline', () => {
    // Friday's deadline is 8:30, so Friday is over at 10:30, not 11:00.
    expect(day(commuteDayAt(commute, nairobi('2026-09-24', '11:01')))).toBe(day(nairobi('2026-09-25')));
    expect(day(commuteDayAt(commute, nairobi('2026-09-25', '10:30')))).toBe(day(nairobi('2026-09-25')));
    expect(day(commuteDayAt(commute, nairobi('2026-09-25', '11:01')))).toBe(day(nairobi('2026-09-26')));
  });

  it('stays on today while tomorrow’s later arrive-by would still read as today’s', () => {
    // Friday 10:45: Friday's 8:30 is over, but Saturday's 9:00 would be read as Friday's 9:00, already late.
    expect(day(commuteDayAt(commute, nairobi('2026-09-25', '10:45')))).toBe(day(nairobi('2026-09-25')));
  });
});
