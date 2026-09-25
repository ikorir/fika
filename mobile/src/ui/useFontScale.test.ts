import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus, PixelRatio } from 'react-native';

import { useFontScale } from '@/ui/useFontScale';

let scale: number;
let appState: ((state: AppStateStatus) => void) | undefined;
const remove = jest.fn();

beforeEach(() => {
  scale = 1;
  appState = undefined;
  jest.spyOn(PixelRatio, 'getFontScale').mockImplementation(() => scale);
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((event: string, handler: (s: AppStateStatus) => void) => {
    if (event === 'change') appState = handler;
    return { remove };
  }) as unknown as typeof AppState.addEventListener);
});
afterEach(() => jest.restoreAllMocks());

describe('useFontScale', () => {
  it('returns the phone text scale', async () => {
    scale = 1.35;
    const { result } = await renderHook(() => useFontScale());
    expect(result.current).toBe(1.35);
  });

  it('reads it again when the app comes back to the front', async () => {
    const { result, unmount } = await renderHook(() => useFontScale());
    expect(result.current).toBe(1);

    scale = 2; // changed in Settings while Fika was in the background
    await act(() => appState?.('background'));
    expect(result.current).toBe(1);
    await act(() => appState?.('active'));
    expect(result.current).toBe(2);

    await unmount();
    expect(remove).toHaveBeenCalled();
  });
});
