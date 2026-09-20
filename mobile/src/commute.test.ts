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

    await expect(loadCommute()).resolves.toEqual({ ...mine, contact: { ...mine.contact, phone: '254712345678' } });
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
