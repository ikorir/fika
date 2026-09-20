import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Commute, RoutesResponse } from '@/contract';
import { seedCommute } from '@/seed';
import { LAST_ROUTES_KEY, loadLastRoutes, saveLastRoutes } from '@/today/lastRoutes';

const response: RoutesResponse = {
  fetchedAt: '2026-09-21T07:40:00+03:00',
  samples: [
    {
      departAt: '2026-09-21T07:40:00+03:00',
      kind: 'now',
      routes: [
        {
          id: 'waiyaki-way',
          label: 'via Waiyaki Way',
          durationSec: 2400,
          staticDurationSec: 1800,
          distanceM: 12000,
          polyline: 'abc',
        },
      ],
    },
  ],
};

const elsewhere: Commute = {
  ...seedCommute,
  destination: { ...seedCommute.destination, location: { lat: -1.3, lng: 36.9 } },
};

beforeEach(() => AsyncStorage.clear());

describe('the last routes on the phone', () => {
  it('has nothing to show before the first fetch', async () => {
    expect(await loadLastRoutes(seedCommute)).toBeNull();
  });

  it('reads back what was saved for this commute', async () => {
    await saveLastRoutes(seedCommute, response);
    expect(await loadLastRoutes(seedCommute)).toEqual(response);
  });

  it('keeps another commute’s routes off the screen', async () => {
    await saveLastRoutes(seedCommute, response);
    expect(await loadLastRoutes(elsewhere)).toBeNull();
  });

  it('ignores nonsense in storage', async () => {
    await AsyncStorage.setItem(LAST_ROUTES_KEY, '{"for":');
    expect(await loadLastRoutes(seedCommute)).toBeNull();

    await AsyncStorage.setItem(LAST_ROUTES_KEY, JSON.stringify({ for: 'anything', response: { samples: 3 } }));
    expect(await loadLastRoutes(seedCommute)).toBeNull();
  });
});
