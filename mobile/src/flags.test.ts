import AsyncStorage from '@react-native-async-storage/async-storage';

import { flag, FLAGS_KEY, setFlag } from '@/flags';

// The build's own defaults are app.json's `extra.flags` (D7).
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: require('../app.json').expo } }));

beforeEach(() => AsyncStorage.clear());

describe('flag', () => {
  it('is what app.json says until the phone overrides it (D7)', async () => {
    await expect(flag('backgroundReminder')).resolves.toBe(true);
    await expect(flag('recap')).resolves.toBe(true);
    await expect(flag('secondContact')).resolves.toBe(true);
    await expect(flag('calendar')).resolves.toBe(true);
    await expect(flag('liveActivity')).resolves.toBe(false);
  });

  it('is overridden on this phone under fika.flags, without a rebuild', async () => {
    expect(FLAGS_KEY).toBe('fika.flags');
    await setFlag('backgroundReminder', false);
    await setFlag('liveActivity', true);
    await expect(flag('backgroundReminder')).resolves.toBe(false);
    await expect(flag('liveActivity')).resolves.toBe(true);
    await expect(flag('recap')).resolves.toBe(true);
    expect(JSON.parse((await AsyncStorage.getItem(FLAGS_KEY))!)).toEqual({
      version: 1,
      flags: { backgroundReminder: false, liveActivity: true },
    });
  });

  it('goes back to the build’s default when the override is cleared', async () => {
    await setFlag('backgroundReminder', false);
    await setFlag('backgroundReminder', null);
    await expect(flag('backgroundReminder')).resolves.toBe(true);
  });

  it('ignores an override it cannot read, and storage that will not answer', async () => {
    await AsyncStorage.setItem(FLAGS_KEY, '{"flags":');
    await expect(flag('backgroundReminder')).resolves.toBe(true);
    await AsyncStorage.setItem(FLAGS_KEY, JSON.stringify({ version: 1, flags: { backgroundReminder: 'no' } }));
    await expect(flag('backgroundReminder')).resolves.toBe(true);
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(flag('liveActivity')).resolves.toBe(false);
  });
});
