import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Text } from 'react-native';

import { theme } from '@/theme';
import { Press } from '@/ui/Press';

const { duration, pressScale } = theme.motion;
const settle = () => act(() => jest.advanceTimersByTime(duration.fast + 100));

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

describe('Press', () => {
  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(
      <Press accessibilityRole="button" onPress={onPress}>
        <Text>Go</Text>
      </Press>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Go' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress while disabled', async () => {
    const onPress = jest.fn();
    await render(
      <Press accessibilityRole="button" disabled onPress={onPress}>
        <Text>Go</Text>
      </Press>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Go' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('passes accessibility props through', async () => {
    await render(
      <Press
        accessibilityRole="radio"
        accessibilityLabel="Limuru Road"
        accessibilityHint="Shows this route"
        accessibilityState={{ selected: true }}
      />,
    );
    const radio = screen.getByRole('radio', { name: 'Limuru Road', selected: true });
    expect(screen.getByHintText('Shows this route')).toBe(radio);
  });

  it('marks a disabled Press as disabled for assistive tech', async () => {
    await render(<Press accessibilityRole="button" accessibilityLabel="Save" disabled />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('gives an 8 pt hit slop by default and keeps one it is given', async () => {
    await render(
      <>
        <Press accessibilityRole="button" accessibilityLabel="Default" />
        <Press accessibilityRole="link" accessibilityLabel="Wide" hitSlop={10} />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Default' }).props.hitSlop).toBe(8);
    expect(screen.getByRole('link', { name: 'Wide' }).props.hitSlop).toBe(10);
  });

  it('keeps an object style', async () => {
    await render(<Press accessibilityRole="button" accessibilityLabel="Go" style={{ height: 56, backgroundColor: 'orange' }} />);
    expect(screen.getByRole('button', { name: 'Go' })).toHaveStyle({ height: 56, backgroundColor: 'orange' });
  });

  it('resolves a function style with the pressed state', async () => {
    await render(
      <Press
        accessibilityRole="button"
        accessibilityLabel="Go"
        style={({ pressed }) => ({ backgroundColor: pressed ? 'red' : 'blue' })}
      />,
    );
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toHaveStyle({ backgroundColor: 'blue' });
    await fireEvent(button, 'pressIn');
    expect(screen.getByRole('button', { name: 'Go' })).toHaveStyle({ backgroundColor: 'red' });
    await fireEvent(button, 'pressOut');
    expect(screen.getByRole('button', { name: 'Go' })).toHaveStyle({ backgroundColor: 'blue' });
  });

  it('dips and dims while pressed, and comes back on release', async () => {
    const onPressIn = jest.fn();
    const onPressOut = jest.fn();
    await render(<Press accessibilityRole="button" accessibilityLabel="Go" onPressIn={onPressIn} onPressOut={onPressOut} />);
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });

    await fireEvent(button, 'pressIn');
    await settle();
    expect(button).toHaveAnimatedStyle({ opacity: 0.85, transform: [{ scale: pressScale }] });
    expect(onPressIn).toHaveBeenCalledTimes(1);

    await fireEvent(button, 'pressOut');
    await settle();
    expect(button).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
    expect(onPressOut).toHaveBeenCalledTimes(1);
  });

  it('dims from the opacity its style already has', async () => {
    await render(<Press accessibilityRole="button" accessibilityLabel="Reset" style={{ opacity: 0.4 }} />);
    const button = screen.getByRole('button', { name: 'Reset' });
    expect(button).toHaveAnimatedStyle({ opacity: 0.4 });
    await fireEvent(button, 'pressIn');
    await settle();
    expect(button).toHaveAnimatedStyle({ opacity: 0.4 * 0.85 });
  });

  it('does not animate while disabled', async () => {
    await render(<Press accessibilityRole="button" accessibilityLabel="Go" disabled />);
    const button = screen.getByRole('button', { name: 'Go' });
    await fireEvent(button, 'pressIn');
    await settle();
    expect(button).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
  });

  it('only dims, without scaling, when reduce motion is on', async () => {
    reduceMotion = true;
    await render(<Press accessibilityRole="button" accessibilityLabel="Go" />);
    await settle(); // the reduce motion setting arrives
    const button = screen.getByRole('button', { name: 'Go' });
    await fireEvent(button, 'pressIn');
    await settle();
    expect(button).toHaveAnimatedStyle({ opacity: 0.85, transform: [{ scale: 1 }] });
  });
});

describe('Press haptic', () => {
  it('gives a light tap before onPress when asked to', async () => {
    const Haptics = jest.requireMock<typeof import('expo-haptics')>('expo-haptics');
    const onPress = jest.fn();
    await render(<Press accessibilityRole="button" accessibilityLabel="Pick" haptic="select" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pick' }));
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(jest.mocked(Haptics.impactAsync).mock.invocationCallOrder[0]).toBeLessThan(onPress.mock.invocationCallOrder[0]);
  });

  it('stays silent without the prop, and while disabled', async () => {
    const Haptics = jest.requireMock<typeof import('expo-haptics')>('expo-haptics');
    jest.mocked(Haptics.impactAsync).mockClear();
    await render(
      <>
        <Press accessibilityRole="button" accessibilityLabel="Plain" onPress={() => {}} />
        <Press accessibilityRole="button" accessibilityLabel="Off" haptic="select" disabled onPress={() => {}} />
      </>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Plain' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Off' }));
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });
});
