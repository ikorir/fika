import { act, render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { Evaluation } from '@/contract';
import { theme } from '@/theme';
import { stateIndex, useStateColor } from '@/ui/useStateColor';

const { color, motion } = theme;

/** '#12261C' → 'rgba(18, 38, 28, 1)', the form Reanimated gives an interpolated colour in. */
const rgba = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, 1)`;
};

function Swatches({ state }: { state: Evaluation['state'] }) {
  const { background, foreground, fill, alert } = useStateColor(state);
  return (
    <View>
      <Animated.View testID="background" style={background} />
      <Animated.View testID="fill" style={fill} />
      <Animated.Text testID="foreground" style={foreground}>
        label
      </Animated.Text>
      <Animated.Text testID="alert" style={alert}>
        8:05
      </Animated.Text>
      <Text>{state}</Text>
    </View>
  );
}

const colours = () => ({
  background: screen.getByTestId('background'),
  fill: screen.getByTestId('fill'),
  foreground: screen.getByTestId('foreground'),
  alert: screen.getByTestId('alert'),
});

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('stateIndex', () => {
  it('puts on time at 0, at risk at 1 and late at 2', () => {
    expect(stateIndex).toEqual({ on_time: 0, at_risk: 1, late: 2 });
  });
});

describe('useStateColor', () => {
  it.each([
    ['on_time', color.onTimeTint, color.onTime, color.text],
    ['at_risk', color.atRiskTint, color.atRisk, color.atRisk],
    ['late', color.lateTint, color.late, color.late],
  ] as const)('starts %s in its own colours, with no tween', async (state, tint, fg, alert) => {
    await render(<Swatches state={state} />);
    const c = colours();
    expect(c.background).toHaveAnimatedStyle({ backgroundColor: rgba(tint) });
    expect(c.fill).toHaveAnimatedStyle({ backgroundColor: rgba(fg) });
    expect(c.foreground).toHaveAnimatedStyle({ color: rgba(fg) });
    expect(c.alert).toHaveAnimatedStyle({ color: rgba(alert) });
  });

  it('tweens every colour to the new state over the base duration', async () => {
    const { rerender } = await render(<Swatches state="on_time" />);
    await rerender(<Swatches state="late" />);
    await act(() => jest.advanceTimersByTime(motion.duration.base / 2));
    const c = colours();
    // Half way the colour is neither end.
    for (const end of [rgba(color.onTimeTint), rgba(color.lateTint)])
      expect(c.background).not.toHaveAnimatedStyle({ backgroundColor: end });

    await act(() => jest.advanceTimersByTime(motion.duration.base / 2 + 20));
    expect(c.background).toHaveAnimatedStyle({ backgroundColor: rgba(color.lateTint) });
    expect(c.fill).toHaveAnimatedStyle({ backgroundColor: rgba(color.late) });
    expect(c.foreground).toHaveAnimatedStyle({ color: rgba(color.late) });
    expect(c.alert).toHaveAnimatedStyle({ color: rgba(color.late) });
  });

  it('keeps the alert colour white on time, and tweens it from white when the state turns', async () => {
    const { rerender } = await render(<Swatches state="late" />);
    await rerender(<Swatches state="on_time" />);
    await act(() => jest.advanceTimersByTime(motion.duration.base + 20));
    expect(colours().alert).toHaveAnimatedStyle({ color: rgba(color.text) });
    expect(colours().foreground).toHaveAnimatedStyle({ color: rgba(color.onTime) });
  });
});
