import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Linking } from 'react-native';

import type { Simulation } from '@/contract';
import { savedCommute, savedRoutes, scriptSteps } from '@/demo/saved';
import { evaluate } from '@/engine';
import { theme } from '@/theme';
import { PrimaryAction } from '@/today/PrimaryAction';

const steps = scriptSteps(savedCommute, savedRoutes.samples, new Date('2026-09-20T22:00:00+03:00'));
const onTime = steps.find((s) => s.evaluation.state === 'on_time')!.evaluation;
const late = steps.find((s) => s.evaluation.state === 'late' && !s.evaluation.betterRouteId)!.evaluation;
const reminder = { at: null, set: false, toggle: () => {} };

describe('PrimaryAction at large text sizes', () => {
  it('keeps its label on one line, shrinking it to 80% before it cuts', async () => {
    await render(<PrimaryAction evaluation={late} reminder={reminder} onSelectRoute={() => {}} onReviewNotice={() => {}} />);
    const label = screen.getByText('Review and send notice');
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.adjustsFontSizeToFit).toBe(true);
    expect(label.props.minimumFontScale).toBe(0.8);
  });
});

describe('PrimaryAction with reminders turned off', () => {
  const blocked = { at: onTime.remindAt, set: false, blocked: true, toggle: () => {} };

  it('says reminders are off in a card, with a way to the phone’s settings, in place of "Remind me"', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await render(<PrimaryAction evaluation={onTime} reminder={blocked} onSelectRoute={() => {}} onReviewNotice={() => {}} />);
    expect(screen.getByTestId('empty-state')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Reminders are off' })).toBeOnTheScreen();
    expect(screen.getByText(/Turn on notifications for Fika/)).toBeOnTheScreen();
    expect(screen.queryByText(/^Remind me at/)).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Open settings' }));
    expect(openSettings).toHaveBeenCalledTimes(1);
    openSettings.mockRestore();
  });

  it('offers "Remind me" as before while notifications are not known to be off', async () => {
    await render(
      <PrimaryAction evaluation={onTime} reminder={{ ...blocked, blocked: false }} onSelectRoute={() => {}} onReviewNotice={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /^Remind me at / })).toBeOnTheScreen();
    expect(screen.queryByTestId('empty-state')).not.toBeOnTheScreen();
  });
});

describe('PrimaryAction at leave-by (W11, D11)', () => {
  const { base } = theme.motion.duration;
  const accident = { routeId: 'limuru-road', addMin: 25, cause: 'Accident on Limuru Road' };
  /** The saved routes at `hhmm` on the app clock, with Limuru Road on screen: at risk, "Switch to …" offered. */
  const at = (hhmm: string, simulation: Simulation = { delay: accident }) =>
    evaluate({
      commute: savedCommute,
      samples: savedRoutes.samples,
      now: new Date('2026-09-20T22:00:00+03:00'),
      selectedRouteId: 'limuru-road',
      simulation: { ...simulation, clock: `2026-09-21T${hhmm}:00+03:00` },
    });
  const action = (e: ReturnType<typeof at>) => (
    <PrimaryAction evaluation={e} reminder={reminder} onSelectRoute={() => {}} onReviewNotice={() => {}} />
  );
  const scale = (value: number) => ({ transform: [{ scale: value }] });
  const button = () => screen.getByTestId('primary-action');

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

  it('scales 1 → 1.04 → 1 once as the countdown reaches zero', async () => {
    // With the accident, leave-by is 7:30: at 7:25 the countdown runs, at 7:30 it is at zero.
    const { rerender } = await render(action(at('07:25')));
    expect(screen.getByText('Switch to Nairobi Expressway')).toBeOnTheScreen();
    await act(() => jest.advanceTimersByTime(base));
    expect(button()).toHaveAnimatedStyle(scale(1));

    await rerender(action(at('07:30')));
    await act(() => jest.advanceTimersByTime(base));
    expect(button()).toHaveAnimatedStyle(scale(1.04));
    await act(() => jest.advanceTimersByTime(base));
    expect(button()).toHaveAnimatedStyle(scale(1));
  });

  it('does not pulse again for the same leave-by, only for the next one', async () => {
    const { rerender } = await render(action(at('07:30')));
    await act(() => jest.advanceTimersByTime(2 * base));
    await rerender(action(at('07:30')));
    await act(() => jest.advanceTimersByTime(base));
    expect(button()).toHaveAnimatedStyle(scale(1));

    // Without the accident and with Kiambu Road on screen, leave-by is 7:50: at 7:50, zero again.
    const next = evaluate({
      commute: savedCommute,
      samples: savedRoutes.samples,
      now: new Date(),
      selectedRouteId: 'kiambu-road',
      simulation: { clock: '2026-09-21T07:50:00+03:00' },
    });
    await rerender(action(next));
    expect(screen.getByText('Switch to Limuru Road')).toBeOnTheScreen();
    await act(() => jest.advanceTimersByTime(base));
    expect(button()).toHaveAnimatedStyle(scale(1.04));
  });

  it('does not pulse with reduce motion on', async () => {
    reduceMotion = true;
    const { rerender } = await render(action(at('07:25')));
    await act(() => Promise.resolve()); // the phone's answer to "reduce motion?"
    await rerender(action(at('07:30')));
    await act(() => jest.advanceTimersByTime(base));
    expect(button()).toHaveAnimatedStyle(scale(1));
  });
});
