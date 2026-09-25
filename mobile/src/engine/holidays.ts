// Kenyan public holidays (W6): the morning reminder skips them, and on one the Today screen says so.
import { nairobiTimeOnDay } from '@/time';

/**
 * The gazetted public holidays for 2026 and 2027, by Nairobi calendar day. Source: the Public Holidays Act, Cap. 110,
 * checked by the coordinator on 2026-09-25. A holiday that falls on a Sunday is observed on the Monday after, and that
 * Monday is the date listed; a Saturday holiday gets no substitute. Mazingira Day (10 Oct) was renamed in 2024.
 *
 * Check this list against each year's Kenya Gazette notice before relying on it, and apply the moved-to-Monday rule
 * to any new year added. Idd-ul-Fitr and Idd-ul-Adha move with the moon and are gazetted only days before: the 2026
 * ones are in, the 2027 ones are not announced yet and are left out on purpose. Add them once they are gazetted.
 */
export const HOLIDAYS: Readonly<Record<string, string>> = {
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
  '2027-10-11': 'Mazingira Day', // observed: 10 Oct 2027 is a Sunday
  '2027-10-20': 'Mashujaa Day',
  '2027-12-13': 'Jamhuri Day', // observed: 12 Dec 2027 is a Sunday
  '2027-12-25': 'Christmas Day',
  '2027-12-27': 'Boxing Day', // observed: 26 Dec 2027 is a Sunday
};

/** "2026-12-25": the Nairobi calendar day an instant falls on. */
export const nairobiDate = (date: Date) => nairobiTimeOnDay('00:00', date).slice(0, 10);

/** The holiday's name when the Nairobi calendar day of `date` is a public holiday, otherwise null. */
export function isPublicHoliday(date: Date): string | null {
  return HOLIDAYS[nairobiDate(date)] ?? null;
}
