import { commuteDays } from '@/engine/days';

const nairobi = (day: string, hhmm = '00:00') => new Date(`${day}T${hhmm}:00+03:00`);
const days = (...keys: string[]) => keys.map((k) => nairobi(k).toISOString());
const iso = (dates: Date[]) => dates.map((d) => d.toISOString());

const quiet = { quietWeekends: true };
const everyDay = { quietWeekends: false };

describe('commuteDays', () => {
  it('skips Saturday and Sunday when weekends are quiet, across a month end', () => {
    expect(iso(commuteDays(quiet, nairobi('2026-09-24', '07:00'), 7))).toEqual(
      days('2026-09-24', '2026-09-25', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'),
    );
  });

  it('keeps the weekend when weekends are not quiet', () => {
    expect(iso(commuteDays(everyDay, nairobi('2026-09-24', '07:00'), 7))).toEqual(
      days('2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30'),
    );
  });

  it('counts from the Nairobi calendar day of `from`', () => {
    // 20:59 UTC Friday is 23:59 Friday in Nairobi; a minute later it is Saturday there.
    expect(iso(commuteDays(quiet, new Date('2026-09-25T20:59:00Z'), 1))).toEqual(days('2026-09-25'));
    expect(iso(commuteDays(quiet, new Date('2026-09-25T21:00:00Z'), 1))).toEqual(days('2026-09-28'));
    expect(iso(commuteDays(everyDay, new Date('2026-09-25T21:00:00Z'), 1))).toEqual(days('2026-09-26'));
  });

  it('gives each day as its Nairobi midnight', () => {
    const [first] = commuteDays(quiet, nairobi('2026-09-24', '18:45'), 1);
    expect(first.toISOString()).toBe('2026-09-23T21:00:00.000Z');
  });

  it('gives nothing for a count of nothing', () => {
    expect(commuteDays(quiet, nairobi('2026-09-24'), 0)).toEqual([]);
  });

  it('skips public holidays over the Christmas week, weekends quiet or not', () => {
    // Christmas 2026 is a Friday and Boxing Day a Saturday (no Monday off for a Saturday).
    expect(iso(commuteDays(quiet, nairobi('2026-12-21'), 5))).toEqual(
      days('2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-28'),
    );
    expect(iso(commuteDays(everyDay, nairobi('2026-12-21'), 6))).toEqual(
      days('2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-27', '2026-12-28'),
    );
  });

  it('skips a holiday observed on the Monday', () => {
    // Jamhuri Day 2027 is a Sunday, so the Monday after is the day off.
    expect(iso(commuteDays(quiet, nairobi('2027-12-10'), 2))).toEqual(days('2027-12-10', '2027-12-14'));
  });
});
