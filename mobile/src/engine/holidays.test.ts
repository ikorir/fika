import { HOLIDAYS, isPublicHoliday } from '@/engine/holidays';

const nairobi = (day: string, hhmm = '12:00') => new Date(`${day}T${hhmm}:00+03:00`);

describe('isPublicHoliday', () => {
  it('names the holiday on the day itself', () => {
    expect(isPublicHoliday(nairobi('2026-12-25'))).toBe('Christmas Day');
    expect(isPublicHoliday(nairobi('2026-06-01'))).toBe('Madaraka Day');
  });

  it('is nothing the day before', () => {
    expect(isPublicHoliday(nairobi('2026-12-24'))).toBeNull();
    expect(isPublicHoliday(nairobi('2026-05-31'))).toBeNull();
  });

  it('turns over at midnight in Nairobi, whatever the phone’s time zone', () => {
    // 20:59 UTC on the 24th is 23:59 in Nairobi; 21:00 UTC is already Christmas there.
    expect(isPublicHoliday(new Date('2026-12-24T20:59:00Z'))).toBeNull();
    expect(isPublicHoliday(new Date('2026-12-24T21:00:00Z'))).toBe('Christmas Day');
    expect(isPublicHoliday(new Date('2026-12-25T20:59:00Z'))).toBe('Christmas Day');
    expect(isPublicHoliday(new Date('2026-12-25T21:00:00Z'))).toBe('Boxing Day');
  });

  it('has the verified 2026 and 2027 dates, with a Sunday holiday observed on the Monday', () => {
    expect(HOLIDAYS).toEqual({
      '2026-01-01': "New Year's Day",
      '2026-03-20': 'Idd-ul-Fitr',
      '2026-04-03': 'Good Friday',
      '2026-04-06': 'Easter Monday',
      '2026-05-01': 'Labour Day',
      '2026-05-27': 'Idd-ul-Adha',
      '2026-06-01': 'Madaraka Day',
      '2026-10-10': 'Mazingira Day',
      '2026-10-20': 'Mashujaa Day',
      '2026-12-12': 'Jamhuri Day',
      '2026-12-25': 'Christmas Day',
      '2026-12-26': 'Boxing Day',
      '2027-01-01': "New Year's Day",
      '2027-03-26': 'Good Friday',
      '2027-03-29': 'Easter Monday',
      '2027-05-01': 'Labour Day',
      '2027-06-01': 'Madaraka Day',
      '2027-10-11': 'Mazingira Day',
      '2027-10-20': 'Mashujaa Day',
      '2027-12-13': 'Jamhuri Day',
      '2027-12-25': 'Christmas Day',
      '2027-12-27': 'Boxing Day',
    });
  });

  it('knows nothing of a year it has no table for', () => {
    expect(isPublicHoliday(nairobi('2028-12-25'))).toBeNull();
  });
});
