import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { theme } from '@/theme';
import { useMotion } from '@/ui/motion';
import { useReduceMotion } from '@/ui/useReduceMotion';

let reduceMotion: boolean;
let changed: ((on: boolean) => void) | undefined;
const remove = jest.fn();

beforeEach(() => {
  reduceMotion = false;
  changed = undefined;
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(() => Promise.resolve(reduceMotion));
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((event: string, handler: (on: boolean) => void) => {
    if (event === 'reduceMotionChanged') changed = handler;
    return { remove };
  }) as unknown as typeof AccessibilityInfo.addEventListener);
});
afterEach(() => jest.restoreAllMocks());

describe('theme.motion', () => {
  it('holds the durations, the easing and the press scale', () => {
    expect(theme.motion.duration).toEqual({ fast: 150, base: 250, slow: 400 });
    expect(typeof theme.motion.easing).toBe('function');
    expect(theme.motion.pressScale).toBe(0.97);
  });
});

describe('useReduceMotion', () => {
  it('returns the phone setting', async () => {
    reduceMotion = true;
    const { result } = await renderHook(() => useReduceMotion());
    expect(result.current).toBe(true);
  });

  it('follows the setting when it changes', async () => {
    const { result, unmount } = await renderHook(() => useReduceMotion());
    expect(result.current).toBe(false);
    await act(() => changed?.(true));
    expect(result.current).toBe(true);
    await act(() => changed?.(false));
    expect(result.current).toBe(false);
    await unmount();
    expect(remove).toHaveBeenCalled();
  });
});

describe('useMotion', () => {
  it('gives the enter, exit and layout presets, timed by the tokens, while reduce motion is off', async () => {
    const { result } = await renderHook(() => useMotion());
    const { duration } = theme.motion;
    expect(result.current.enter?.getDuration()).toBe(duration.base);
    expect(result.current.exit?.getDuration()).toBe(duration.fast);
    expect(result.current.layout?.getDuration()).toBe(duration.base);
  });

  it('gives no presets while reduce motion is on', async () => {
    reduceMotion = true;
    const { result } = await renderHook(() => useMotion());
    expect(result.current).toEqual({ enter: undefined, exit: undefined, layout: undefined });
  });

  it('drops the presets the moment reduce motion is turned on', async () => {
    const { result } = await renderHook(() => useMotion());
    expect(result.current.enter).toBeDefined();
    await act(() => changed?.(true));
    expect(result.current).toEqual({ enter: undefined, exit: undefined, layout: undefined });
  });
});
