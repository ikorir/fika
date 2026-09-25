import { countdownFraction } from '@/today/countdown';

const leaveBy = '2026-09-21T07:50:00+03:00';
/** The instant `min` minutes before leave-by (after it when negative). */
const before = (min: number) => new Date(Date.parse(leaveBy) - min * 60_000);

describe('countdownFraction', () => {
  it.each([
    [16, null],
    [15, 1],
    [7.5, 0.5],
    [0, 0],
    [-1, null],
  ])('%s min before leave-by is %s', (min, fraction) => {
    expect(countdownFraction(before(min), leaveBy)).toBe(fraction);
  });

  it('takes the clock as ISO too, as an evaluation carries it', () => {
    expect(countdownFraction(before(3).toISOString(), leaveBy)).toBeCloseTo(0.2);
  });

  it('is null with no leave-by', () => {
    expect(countdownFraction(before(5), null)).toBeNull();
  });

  it('drains over another window when given one', () => {
    expect(countdownFraction(before(10), leaveBy, 20)).toBe(0.5);
    expect(countdownFraction(before(16), leaveBy, 20)).toBeCloseTo(0.8);
  });
});
