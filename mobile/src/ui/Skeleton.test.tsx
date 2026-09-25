import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, View } from 'react-native';

import { theme } from '@/theme';
import { Skeleton } from '@/ui/Skeleton';

const { color } = theme;
const rgba = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, 1)`;
};
const colourOf = (testID: string): string => screen.getByTestId(testID).props.jestAnimatedStyle.value.backgroundColor;
const HALF_SHIMMER = theme.motion.duration.slow * 2; // surface to raised, or back

let reduceMotion = false;
beforeEach(() => {
  reduceMotion = false;
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(() => Promise.resolve(reduceMotion));
  jest.useFakeTimers();
});
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Skeleton.Block', () => {
  it('takes its width, height and corner radius', async () => {
    await render(
      <Skeleton>
        <Skeleton.Block testID="block" width={120} height={14} radius={4} />
      </Skeleton>,
    );
    expect(screen.getByTestId('block')).toHaveStyle({ width: 120, height: 14, borderRadius: 4 });
  });

  it('shimmers from the surface colour to the raised surface and back', async () => {
    await render(
      <Skeleton>
        <Skeleton.Block testID="block" width={120} height={14} radius={4} />
      </Skeleton>,
    );
    await act(() => jest.advanceTimersByTime(16));
    expect(colourOf('block')).toBe(rgba(color.surface));
    await act(() => jest.advanceTimersByTime(HALF_SHIMMER / 2));
    expect([rgba(color.surface), rgba(color.surfaceRaised)]).not.toContain(colourOf('block'));
    await act(() => jest.advanceTimersByTime(HALF_SHIMMER / 2));
    expect(colourOf('block')).toBe(rgba(color.surfaceRaised));
    await act(() => jest.advanceTimersByTime(HALF_SHIMMER));
    expect(colourOf('block')).toBe(rgba(color.surface));
  });

  it('moves every block in phase, whichever Skeleton it is in and whenever it came', async () => {
    const { rerender } = await render(
      <View>
        <Skeleton>
          <Skeleton.Block testID="hero" width={88} height={28} radius={14} />
        </Skeleton>
      </View>,
    );
    await act(() => jest.advanceTimersByTime(HALF_SHIMMER / 3));
    await rerender(
      <View>
        <Skeleton>
          <Skeleton.Block testID="hero" width={88} height={28} radius={14} />
        </Skeleton>
        <Skeleton>
          <Skeleton.Block testID="routes" width={22} height={22} radius={11} />
        </Skeleton>
      </View>,
    );
    for (const step of [16, HALF_SHIMMER / 4, HALF_SHIMMER / 2]) {
      await act(() => jest.advanceTimersByTime(step));
      expect(colourOf('routes')).toBe(colourOf('hero'));
    }
    expect(colourOf('hero')).not.toBe(rgba(color.surface));
  });

  it('holds still in the surface colour with reduce motion on', async () => {
    reduceMotion = true;
    await render(
      <Skeleton>
        <Skeleton.Block testID="block" width={120} height={14} radius={4} />
      </Skeleton>,
    );
    for (const step of [16, HALF_SHIMMER / 2, HALF_SHIMMER]) {
      await act(() => jest.advanceTimersByTime(step));
      expect(colourOf('block')).toBe(rgba(color.surface));
    }
  });
});
