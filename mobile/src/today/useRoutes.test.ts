import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

import { fetchRoutes } from '@/api';
import type { Commute, RoutesResponse } from '@/contract';
import { seedCommute } from '@/seed';
import { useRoutes } from '@/today/useRoutes';

jest.mock('@/api', () => ({ fetchRoutes: jest.fn() }));

const response = (fetchedAt: string): RoutesResponse => ({ fetchedAt, samples: [] });
function deferred() {
  let resolve: (r: RoutesResponse) => void = () => {};
  const promise = new Promise<RoutesResponse>((r) => (resolve = r));
  return { promise, resolve };
}

// The same commute on a day with an arrive-by of its own: a new object, as the Today screen makes when the day turns.
const thursday: Commute = seedCommute;
const friday: Commute = { ...seedCommute, arriveBy: '08:30' };

beforeEach(async () => {
  jest.mocked(fetchRoutes).mockReset();
  await AsyncStorage.clear();
});

describe('useRoutes when the commute changes under a fetch', () => {
  it('fetches for the new commute at once, and the old commute’s response never lands', async () => {
    const old = deferred();
    const fresh = deferred();
    jest.mocked(fetchRoutes).mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const { result, rerender } = await renderHook((c: Commute) => useRoutes(c), { initialProps: thursday });

    await rerender(friday);
    expect(fetchRoutes).toHaveBeenCalledTimes(2);
    expect(jest.mocked(fetchRoutes).mock.calls[1][0].arriveBy).toMatch(/T08:30:00\+03:00$/);

    await act(async () => fresh.resolve(response('friday')));
    await act(async () => old.resolve(response('thursday')));
    expect(result.current.data?.fetchedAt).toBe('friday');
    expect(result.current.loading).toBe(false);
  });

  it('keeps the new commute’s spinner going when the old fetch ends first', async () => {
    const old = deferred();
    const fresh = deferred();
    jest.mocked(fetchRoutes).mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const { result, rerender } = await renderHook((c: Commute) => useRoutes(c), { initialProps: thursday });
    await rerender(friday);

    await act(async () => old.resolve(response('thursday')));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);
    await act(async () => fresh.resolve(response('friday')));
    expect(result.current.data?.fetchedAt).toBe('friday');
  });

  it('still joins a second ask for the same commute to the fetch in flight', async () => {
    const only = deferred();
    jest.mocked(fetchRoutes).mockReturnValueOnce(only.promise);
    const { result } = await renderHook(() => useRoutes(thursday));
    await act(async () => {
      result.current.refresh();
    });
    expect(fetchRoutes).toHaveBeenCalledTimes(1);
    await act(async () => only.resolve(response('thursday')));
    expect(result.current.data?.fetchedAt).toBe('thursday');
  });
});
