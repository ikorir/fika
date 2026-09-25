import AsyncStorage from '@react-native-async-storage/async-storage';

import { COMMUTE_KEY, saveCommute } from '@/commute';
import { seedCommute } from '@/seed';
import { firstScreen, loadFirstScreen, saveWelcomed, WELCOMED_KEY } from '@/store/welcomed';

beforeEach(() => AsyncStorage.clear());

describe('firstScreen', () => {
  it('opens on the welcome screen only when the phone has neither been welcomed nor stored a commute', () => {
    expect(firstScreen({ welcomed: false, storedCommute: false })).toBe('welcome');
    expect(firstScreen({ welcomed: true, storedCommute: false })).toBe('today');
    expect(firstScreen({ welcomed: false, storedCommute: true })).toBe('today'); // the demo phone, set up before v2
    expect(firstScreen({ welcomed: true, storedCommute: true })).toBe('today');
  });
});

describe('the welcomed key', () => {
  it('is fika.welcomed', () => {
    expect(WELCOMED_KEY).toBe('fika.welcomed');
  });

  it('opens a fresh phone on the welcome screen', async () => {
    await expect(loadFirstScreen()).resolves.toBe('welcome');
  });

  it('never welcomes a phone that already has a commute stored', async () => {
    await saveCommute(seedCommute);
    expect(await AsyncStorage.getItem(COMMUTE_KEY)).not.toBeNull();
    await expect(loadFirstScreen()).resolves.toBe('today');
  });

  it('opens on Today on every launch after the commuter was welcomed, with a version on what it stores', async () => {
    await saveWelcomed(new Date('2026-09-25T08:00:00+03:00'));
    await expect(loadFirstScreen()).resolves.toBe('today');
    await expect(loadFirstScreen()).resolves.toBe('today');
    expect(JSON.parse((await AsyncStorage.getItem(WELCOMED_KEY))!)).toEqual({ version: 1, at: '2026-09-25T05:00:00.000Z' });
  });

  it('opens on Today, as it always has, when the phone’s storage will not answer', async () => {
    jest.spyOn(AsyncStorage, 'multiGet').mockRejectedValueOnce(new Error('storage is broken'));
    await expect(loadFirstScreen()).resolves.toBe('today');
  });
});
