import { act, render, screen } from '@testing-library/react-native';
import Animated from 'react-native-reanimated';

import { usePulse } from '@/ui/usePulse';

function Words({ on }: { on: boolean }) {
  return (
    <Animated.Text testID="words" style={usePulse(on)}>
      Leave by 8:05
    </Animated.Text>
  );
}

const HALF_BREATH_MS = 650; // the timing the Animated pulse had
const words = () => screen.getByTestId('words');

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('usePulse', () => {
  it('rests at full opacity while off', async () => {
    await render(<Words on={false} />);
    await act(() => jest.advanceTimersByTime(HALF_BREATH_MS));
    expect(words()).toHaveAnimatedStyle({ opacity: 1 });
  });

  it('breathes down to 0.4 over 650 ms and back to full over the next 650, again and again', async () => {
    await render(<Words on />);
    await act(() => jest.advanceTimersByTime(HALF_BREATH_MS));
    expect(words()).toHaveAnimatedStyle({ opacity: 0.4 });
    await act(() => jest.advanceTimersByTime(HALF_BREATH_MS));
    expect(words()).toHaveAnimatedStyle({ opacity: 1 });
    await act(() => jest.advanceTimersByTime(HALF_BREATH_MS));
    expect(words()).toHaveAnimatedStyle({ opacity: 0.4 });
  });

  it('goes back to full opacity at once when turned off mid-breath', async () => {
    const { rerender } = await render(<Words on />);
    await act(() => jest.advanceTimersByTime(HALF_BREATH_MS / 2));
    await rerender(<Words on={false} />);
    expect(words()).toHaveAnimatedStyle({ opacity: 1 });
    await act(() => jest.advanceTimersByTime(HALF_BREATH_MS));
    expect(words()).toHaveAnimatedStyle({ opacity: 1 });
  });
});
