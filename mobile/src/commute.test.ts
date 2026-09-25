import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  COMMUTE_KEY,
  commuteProblems,
  emptyCommute,
  extraMinLabel,
  loadCommute,
  normalisePhone,
  saveCommute,
  withDefaults,
} from '@/commute';
import type { Commute } from '@/contract';
import { seedCommute } from '@/seed';

describe('a commute', () => {
  it('starts with a 10 minute buffer and 5 extra minutes', () => {
    const commute = withDefaults({});
    expect(commute.bufferMin).toBe(10);
    expect(commute.extraMin).toBe(5);
  });
});

describe('a contact phone number', () => {
  // WhatsApp and SMS want international digits with no plus (SPEC.md, stored commute).
  it.each([
    ['0712 345 678', '254712345678'],
    ['0110-123-456', '254110123456'],
    ['+254 712 345 678', '254712345678'],
    ['254712345678', '254712345678'],
    ['712345678', '254712345678'],
    ['(+44) 7911 123456', '447911123456'],
  ])('normalises %s to %s', (typed, stored) => {
    expect(normalisePhone(typed)).toBe(stored);
  });
});

describe('what a commute needs before it can be saved', () => {
  const flagged = (commute: Commute) => Object.keys(commuteProblems(commute)).sort();

  it('asks for both addresses and a contact to reach', () => {
    expect(flagged(emptyCommute)).toEqual(['destination', 'name', 'origin', 'phone']);
  });

  it('is happy with a filled-in commute', () => {
    expect(commuteProblems(seedCommute)).toEqual({});
  });

  it('asks again when the number is too short to dial', () => {
    expect(flagged({ ...seedCommute, contact: { ...seedCommute.contact, phone: '0712 345' } })).toEqual(['phone']);
  });
});

describe('the commute saved on this phone', () => {
  beforeEach(() => AsyncStorage.clear());

  it('is the seeded one until the commuter saves theirs', async () => {
    await expect(loadCommute()).resolves.toEqual(seedCommute);
  });

  it('comes back the way it was saved, with the phone number normalised', async () => {
    const mine: Commute = {
      ...seedCommute,
      arriveBy: '08:30',
      usualDeparture: '07:45',
      bufferMin: 15,
      extraMin: 0,
      mode: 'ride_hail',
      contact: { name: 'Otieno', phone: '0712 345 678', relationship: 'friend' },
    };

    await saveCommute(mine);

    // v2: contacts[0] follows the contact the setup screen edits, and keeps the voice it already had.
    const contact = { ...mine.contact, phone: '254712345678' };
    await expect(loadCommute()).resolves.toEqual({
      ...mine,
      contact,
      contacts: [{ ...contact, tone: 'manager', language: 'en' }],
    });
  });

  it('survives a restart, so a second read still has it', async () => {
    await saveCommute({ ...seedCommute, arriveBy: '10:15' });
    await loadCommute();
    await expect(loadCommute()).resolves.toMatchObject({ arriveBy: '10:15' });
  });

  it('fills in the defaults when what is stored is missing fields', async () => {
    await AsyncStorage.setItem(COMMUTE_KEY, JSON.stringify({ origin: seedCommute.origin, bufferMin: 'soon' }));

    const commute = await loadCommute();

    expect(commute.origin).toEqual(seedCommute.origin);
    expect(commute.bufferMin).toBe(10);
    expect(commute.extraMin).toBe(5);
  });
});

describe('the extra minutes', () => {
  it('are called parking time for a driver and a pickup wait for a rider', () => {
    expect(extraMinLabel('drive')).toBe('Parking time');
    expect(extraMinLabel('ride_hail')).toBe('Pickup wait');
  });
});

describe('a commute that cannot be read back', () => {
  it('falls back to the seeded one when the phone will not answer', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage unavailable'));

    await expect(loadCommute()).resolves.toEqual(seedCommute);
  });

  it('treats a blank relationship as one that was never set', () => {
    expect(withDefaults({ contact: { name: 'Mary', phone: '', relationship: '  ' } }).contact.relationship).toBe(
      'manager',
    );
  });
});

// A commute stored by v1 of the app, as the demo phone has it: no version, one contact, nothing else.
const v1 = {
  origin: { placeId: 'ChIJ-greatwall', label: 'Greatwall Apartments', location: { lat: -1.3521, lng: 36.9083 } },
  destination: { placeId: 'ChIJ-dtb', label: 'DTB Centre', location: { lat: -1.2839, lng: 36.8264 } },
  arriveBy: '08:30',
  usualDeparture: '07:10',
  bufferMin: 15,
  extraMin: 10,
  mode: 'drive',
  contact: { name: 'Wanjiru', phone: '254712345678', relationship: 'manager' },
};

describe('reading a stored commute (v2)', () => {
  it('reads a v1 commute as v2 without losing any field', () => {
    const read = withDefaults(v1);
    expect(read).toEqual({
      ...v1,
      version: 2,
      quietWeekends: true,
      contacts: [{ ...v1.contact, tone: 'manager', language: 'en' }],
    });
    expect(read).not.toHaveProperty('arriveByByDay');
    expect(read).not.toHaveProperty('returnTrip');
  });

  it('gives a v1 friend the voice the notice has for them today: the friend tone, in English', () => {
    const read = withDefaults({ ...v1, contact: { ...v1.contact, relationship: 'friend' } });
    expect(read.contacts).toEqual([{ ...v1.contact, relationship: 'friend', tone: 'friend', language: 'en' }]);
  });

  it('reads every v2 field back as it was stored', () => {
    const v2 = {
      ...v1,
      version: 2,
      quietWeekends: false,
      arriveByByDay: { fri: '08:00', mon: '09:15' },
      returnTrip: { homeBy: '18:30' },
      contacts: [
        { ...v1.contact, tone: 'friend', language: 'sheng' },
        { name: 'Otieno', phone: '254722000111', relationship: 'friend', tone: 'friend', language: 'sw' },
      ],
    };
    expect(withDefaults(v2)).toEqual(v2);
  });

  it('keeps the contact every older build reads and contacts[0] the same person', () => {
    const read = withDefaults({
      ...v1,
      version: 2,
      contacts: [{ name: 'Someone else', phone: '254700000001', relationship: 'client', tone: 'friend', language: 'sw' }],
    });
    expect(read.contact).toEqual(v1.contact);
    expect(read.contacts[0]).toEqual({ ...v1.contact, tone: 'friend', language: 'sw' });
  });

  it('fills a part-stored v2 commute with defaults, dropping only what cannot be read', () => {
    const read = withDefaults({
      ...v1,
      version: 2,
      quietWeekends: 'yes',
      arriveByByDay: { fri: '8:30am', tue: '07:45', someday: '07:00' },
      returnTrip: { homeBy: 'late' },
      contacts: 'Wanjiru',
    });
    expect(read.quietWeekends).toBe(true);
    expect(read.arriveByByDay).toEqual({ tue: '07:45' });
    expect(read).not.toHaveProperty('returnTrip');
    expect(read.contacts).toEqual([{ ...v1.contact, tone: 'manager', language: 'en' }]);
  });

  it('turns garbage into the empty commute, never an error', () => {
    for (const garbage of [null, 42, 'commute', [], { contacts: [null, 3] }]) {
      const read = withDefaults(garbage);
      expect(read).toEqual({ ...emptyCommute });
      expect(read.contacts).toEqual([{ name: '', phone: '', relationship: 'manager', tone: 'manager', language: 'en' }]);
    }
  });
});

describe('saving a v2 commute', () => {
  beforeEach(() => AsyncStorage.clear());

  it('opens a phone with a v1 commute on that commute, and keeps every field through the next save', async () => {
    await AsyncStorage.setItem(COMMUTE_KEY, JSON.stringify(v1));
    const opened = await loadCommute();
    expect(opened).toMatchObject(v1);

    await saveCommute(opened);
    const stored = JSON.parse((await AsyncStorage.getItem(COMMUTE_KEY))!);
    expect(stored).toMatchObject({ ...v1, version: 2, quietWeekends: true });
    expect(await loadCommute()).toEqual(opened);
  });

  it('round-trips every v2 field', async () => {
    const mine: Commute = {
      ...seedCommute,
      quietWeekends: false,
      arriveByByDay: { fri: '08:30', sat: '10:00' },
      returnTrip: { homeBy: '18:00' },
      contacts: [
        { ...seedCommute.contact, tone: 'friend', language: 'sheng' },
        { name: 'Otieno', phone: '254722000111', relationship: 'friend', tone: 'friend', language: 'sw' },
      ],
    };
    await saveCommute(mine);
    await expect(loadCommute()).resolves.toEqual(mine);
  });

  it('stores contact equal to contacts[0] on every save', async () => {
    await saveCommute({ ...seedCommute, contact: { name: 'Achieng', phone: '0733 000 111', relationship: 'client' } });
    const stored = JSON.parse((await AsyncStorage.getItem(COMMUTE_KEY))!);
    const { tone, language, ...first } = stored.contacts[0];
    expect(first).toEqual(stored.contact);
    expect(stored.contact).toEqual({ name: 'Achieng', phone: '254733000111', relationship: 'client' });
    expect({ tone, language }).toEqual({ tone: 'manager', language: 'en' });
  });

  it('opens on the seeded commute when what is stored is not a commute at all', async () => {
    for (const corrupt of ['{"origin":', 'null', '42', '"commute"', '[]']) {
      await AsyncStorage.setItem(COMMUTE_KEY, corrupt);
      await expect(loadCommute()).resolves.toEqual(seedCommute);
    }
  });
});
