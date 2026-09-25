import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { theme } from '@/theme';
import { RollingDigits } from '@/ui/RollingDigits';

const { duration } = theme.motion;
const style = { fontSize: 64, lineHeight: 64, color: '#FFFFFF' };
const LINE = 64;

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

const hidden = { includeHiddenElements: true };
const rolling = () => screen.queryByTestId('rolling', hidden);
// Where a rolling character is drawn, up or down from its place, as Reanimated's test setup reports it.
const offset = (el: { props: Record<string, any> }): number => el.props.jestAnimatedStyle.value.transform[0].translateY;
const frame = () => act(() => jest.advanceTimersByTime(16));

async function show(from: string) {
  const view = await render(<RollingDigits text={from} style={style} maxFontSizeMultiplier={1.2} />);
  await fireEvent(screen.getByTestId('rolling-digits'), 'layout', { nativeEvent: { layout: { height: LINE } } });
  return (to: string) => view.rerender(<RollingDigits text={to} style={style} maxFontSizeMultiplier={1.2} />);
}

describe('RollingDigits', () => {
  it('shows its text in the style it is given', async () => {
    await show('7:50');
    expect(screen.getByText('7:50')).toHaveStyle(style);
    expect(screen.getByText('7:50').props.maxFontSizeMultiplier).toBe(1.2);
    expect(rolling()).toBeNull();
  });

  it('shows the new time at once, rolls the changed digits over the base duration, then rests on the new text', async () => {
    const to = await show('7:50');
    await to('9:13');
    expect(screen.getByText('9:13')).toBeOnTheScreen();
    expect(rolling()).not.toBeNull();
    await act(() => jest.advanceTimersByTime(duration.base));
    expect(rolling()).toBeNull();
    expect(screen.getByText('9:13')).toHaveStyle(style);
    expect(screen.queryByText('7:50')).toBeNull();
  });

  it('rolls a larger digit up into place: in from below, the old one out above', async () => {
    const to = await show('8:05');
    await to('8:06');
    await frame();
    const slot = within(rolling()!);
    const incoming = slot.getByText('6', hidden);
    const outgoing = slot.getByText('5', hidden);
    expect(offset(incoming)).toBeGreaterThan(0);
    expect(offset(outgoing)).toBeLessThanOrEqual(0);
    await act(() => jest.advanceTimersByTime(duration.base - 32));
    expect(offset(incoming)).toBeCloseTo(0, 0);
    expect(offset(outgoing)).toBeCloseTo(-LINE, 0);
  });

  it('rolls a smaller digit down into place: in from above, the old one out below', async () => {
    const to = await show('8:06');
    await to('8:05');
    await frame();
    const slot = within(rolling()!);
    expect(offset(slot.getByText('5', hidden))).toBeLessThan(0);
    await act(() => jest.advanceTimersByTime(duration.base - 32));
    expect(offset(slot.getByText('6', hidden))).toBeCloseTo(LINE, 0);
  });

  it('leaves the digits that did not change, and the colon, where they are', async () => {
    const to = await show('8:05');
    await to('8:06');
    await frame();
    const slot = within(rolling()!);
    for (const still of ['8', ':', '0']) expect(slot.getByText(still, hidden).props.jestAnimatedStyle.value).toEqual({});
  });

  it('renders a change of length whole, one place per character of the new time', async () => {
    const to = await show('9:55');
    await to('10:05');
    expect(screen.getByText('10:05')).toBeOnTheScreen();
    await frame();
    const slot = within(rolling()!);
    for (const char of ['1', '0', ':', '5']) expect(slot.getAllByText(char, hidden).length).toBeGreaterThan(0);
    await act(() => jest.advanceTimersByTime(duration.base));
    expect(rolling()).toBeNull();
    expect(screen.getByText('10:05')).toBeOnTheScreen();

    await to('9:55');
    expect(screen.getByText('9:55')).toBeOnTheScreen();
    await act(() => jest.advanceTimersByTime(duration.base));
    expect(screen.getByText('9:55')).toBeOnTheScreen();
    expect(rolling()).toBeNull();
  });

  it('only rolls from one clock time to another; a word swaps at once', async () => {
    const to = await show('Now');
    await to('8:05');
    expect(screen.getByText('8:05')).toBeOnTheScreen();
    expect(rolling()).toBeNull();
    await to('Now');
    expect(screen.getByText('Now')).toBeOnTheScreen();
    expect(rolling()).toBeNull();
  });

  it('swaps at once with reduce motion on', async () => {
    reduceMotion = true;
    const to = await show('8:05');
    await to('8:06');
    expect(screen.getByText('8:06')).toBeOnTheScreen();
    expect(rolling()).toBeNull();
  });
});
