import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, PixelRatio } from 'react-native';

import { savedCommute, savedRoutes, scriptSteps } from '@/demo/saved';
import { theme } from '@/theme';
import { formatTime } from '@/time';
import { Hero, heroSize } from '@/today/Hero';
import { heroText } from '@/today/words';

const HERO_CAP = 64 * 1.2; // the most the hero time ever measures on screen
const onScreen = (scale: number) => {
  const { fontSize, maxFontSizeMultiplier } = heroSize(scale);
  return fontSize * Math.min(scale, maxFontSizeMultiplier);
};

describe('heroSize', () => {
  it.each([
    [1.0, 64],
    [1.3, 64],
    [1.31, 52],
    [2.0, 52],
  ])('at text scale %s is %s pt, and never beyond 64 × 1.2 on screen', (scale, fontSize) => {
    const size = heroSize(scale);
    expect(size.fontSize).toBe(fontSize);
    expect(size.lineHeight).toBe(fontSize);
    expect(size.fontSize * size.maxFontSizeMultiplier).toBeCloseTo(HERO_CAP);
    expect(onScreen(scale)).toBeLessThanOrEqual(HERO_CAP + 1e-9);
  });

  it('keeps 64 pt at the standard text size', () => {
    expect(onScreen(1)).toBe(64);
  });
});

describe('Hero at large text sizes', () => {
  const evaluation = scriptSteps(savedCommute, savedRoutes.samples, new Date('2026-09-20T22:00:00+03:00'))[0].evaluation;
  afterEach(() => jest.restoreAllMocks());

  const heroTime = () => screen.getByText(formatTime(evaluation.departAt));

  it('draws the time at 64 pt at the standard text size', async () => {
    jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(1);
    await render(<Hero commute={savedCommute} evaluation={evaluation} />);
    expect(heroTime()).toHaveStyle({ fontSize: 64, lineHeight: 64 });
    expect(heroTime().props.maxFontSizeMultiplier).toBe(1.2);
  });

  it('draws the time at 52 pt above a 1.3 text scale', async () => {
    jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(2);
    await render(<Hero commute={savedCommute} evaluation={evaluation} />);
    expect(heroTime()).toHaveStyle({ fontSize: 52, lineHeight: 52 });
    expect(heroTime().props.maxFontSizeMultiplier).toBeCloseTo(HERO_CAP / 52);
  });
});

describe('Hero summary at large text sizes', () => {
  it('grows the commute summary no more than 1.6 times', async () => {
    const evaluation = scriptSteps(savedCommute, savedRoutes.samples, new Date('2026-09-20T22:00:00+03:00'))[0].evaluation;
    await render(<Hero commute={savedCommute} evaluation={evaluation} />);
    expect(screen.getByText(/ to .* · arrive by /).props.maxFontSizeMultiplier).toBe(1.6);
  });
});

describe('Hero in each state', () => {
  const steps = scriptSteps(savedCommute, savedRoutes.samples, new Date('2026-09-20T22:00:00+03:00'));
  const step = (scenario: string) => steps.find((s) => s.scenario === scenario)!.evaluation;
  const rgba = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, 1)`;
  };

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

  it.each([
    ['on_time', 'On time'],
    ['at_risk', 'At risk'],
    ['late', 'Late'],
  ])('renders %s with its pill label, hero label and value', async (scenario, pill) => {
    const evaluation = step(scenario);
    expect(evaluation.state).toBe(scenario);
    const hero = heroText(evaluation, savedCommute);
    await render(<Hero commute={savedCommute} evaluation={evaluation} />);
    expect(screen.getByText(pill)).toBeOnTheScreen();
    expect(screen.getByText(hero.label)).toBeOnTheScreen();
    expect(screen.getByText(hero.value)).toBeOnTheScreen();
  });

  it('draws the hero time white on time and in the state colour otherwise', async () => {
    const { rerender } = await render(<Hero commute={savedCommute} evaluation={step('on_time')} />);
    expect(screen.getByText(heroText(step('on_time'), savedCommute).value)).toHaveAnimatedStyle({
      color: rgba(theme.color.text),
    });
    await rerender(<Hero commute={savedCommute} evaluation={step('at_risk')} />);
    await act(() => jest.advanceTimersByTime(theme.motion.duration.base + 20));
    expect(screen.getByText(heroText(step('at_risk'), savedCommute).value)).toHaveAnimatedStyle({
      color: rgba(theme.color.atRisk),
    });
    await rerender(<Hero commute={savedCommute} evaluation={step('late')} />);
    await act(() => jest.advanceTimersByTime(theme.motion.duration.base + 20));
    expect(screen.getByText(heroText(step('late'), savedCommute).value)).toHaveAnimatedStyle({
      color: rgba(theme.color.late),
    });
    expect(screen.getByText('Late')).toHaveAnimatedStyle({ color: rgba(theme.color.late) });
    expect(screen.getByTestId('status-pill')).toHaveAnimatedStyle({ backgroundColor: rgba(theme.color.lateTint) });
  });

  it('tweens the pill from one state colour to the next instead of snapping', async () => {
    const { rerender } = await render(<Hero commute={savedCommute} evaluation={step('on_time')} />);
    const pill = () => screen.getByTestId('status-pill');
    expect(pill()).toHaveAnimatedStyle({ backgroundColor: rgba(theme.color.onTimeTint) });
    await rerender(<Hero commute={savedCommute} evaluation={step('at_risk')} />);
    await act(() => jest.advanceTimersByTime(theme.motion.duration.base / 2));
    expect(pill()).not.toHaveAnimatedStyle({ backgroundColor: rgba(theme.color.onTimeTint) });
    expect(pill()).not.toHaveAnimatedStyle({ backgroundColor: rgba(theme.color.atRiskTint) });
    await act(() => jest.advanceTimersByTime(theme.motion.duration.base / 2 + 20));
    expect(pill()).toHaveAnimatedStyle({ backgroundColor: rgba(theme.color.atRiskTint) });
  });

  it('brings a new hero value in with the enter and exit presets when its text changes', async () => {
    const { rerender } = await render(<Hero commute={savedCommute} evaluation={step('on_time')} />);
    await rerender(<Hero commute={savedCommute} evaluation={step('at_risk')} />);
    const value = heroText(step('at_risk'), savedCommute).value;
    expect(screen.getByText(value)).toBeOnTheScreen();
    expect(screen.queryByText(heroText(step('on_time'), savedCommute).value)).toBeNull();
    const shown = screen.getByTestId('hero-value');
    expect(shown.props.entering?.getDuration()).toBe(theme.motion.duration.base);
    expect(shown.props.exiting?.getDuration()).toBe(theme.motion.duration.fast);
  });

  it('rolls the digits from one time to the next in place, without the crossfade', async () => {
    const [from, to] = [step('on_time'), step('late')].map((e) => heroText(e, savedCommute).value);
    expect([from, to].every((v) => /^\d{1,2}:\d{2}$/.test(v))).toBe(true);
    const { rerender } = await render(<Hero commute={savedCommute} evaluation={step('on_time')} />);
    const shown = screen.getByTestId('hero-value');
    await rerender(<Hero commute={savedCommute} evaluation={step('late')} />);
    expect(screen.getByTestId('hero-value')).toBe(shown); // the same element: nothing leaves, nothing comes in
    expect(screen.getByText(to)).toBeOnTheScreen();
    expect(screen.getByTestId('rolling', { includeHiddenElements: true })).toBeTruthy();
    await act(() => jest.advanceTimersByTime(theme.motion.duration.base));
    expect(screen.queryByTestId('rolling', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText(to)).toBeOnTheScreen();
  });

  it('swaps the hero value instantly with reduce motion on', async () => {
    reduceMotion = true;
    const { rerender } = await render(<Hero commute={savedCommute} evaluation={step('on_time')} />);
    await rerender(<Hero commute={savedCommute} evaluation={step('at_risk')} />);
    expect(screen.getByText(heroText(step('at_risk'), savedCommute).value)).toBeOnTheScreen();
    const shown = screen.getByTestId('hero-value');
    expect(shown.props.entering).toBeUndefined();
    expect(shown.props.exiting).toBeUndefined();
  });
});

describe('Hero while loading', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  const evaluation = scriptSteps(savedCommute, savedRoutes.samples, new Date('2026-09-20T22:00:00+03:00'))[0].evaluation;
  const time = heroText(evaluation, savedCommute).value;

  it('shows the skeleton, labelled Loading, with the commute summary beside the pill', async () => {
    await render(<Hero commute={savedCommute} loading />);
    expect(screen.getByLabelText('Loading')).toBeOnTheScreen();
    expect(screen.getByText(/ to .* · arrive by /)).toBeOnTheScreen();
    expect(screen.queryByText(time)).toBeNull();
  });

  it('shows the time, and no skeleton, once there is an evaluation', async () => {
    const { rerender } = await render(<Hero commute={savedCommute} loading />);
    await rerender(<Hero commute={savedCommute} evaluation={evaluation} loading={false} />);
    expect(screen.getByText(time)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Loading')).toBeNull();
  });

  it('shows only the summary when nothing is loading and there is no evaluation', async () => {
    await render(<Hero commute={savedCommute} />);
    expect(screen.queryByLabelText('Loading')).toBeNull();
    expect(screen.getByText(/ to .* · arrive by /)).toBeOnTheScreen();
  });

  it('fades the placeholders out and the real hero in with the shared presets', async () => {
    const { rerender } = await render(<Hero commute={savedCommute} loading />);
    expect(screen.getByTestId('hero-skeleton').props.exiting?.getDuration()).toBe(theme.motion.duration.fast);
    await rerender(<Hero commute={savedCommute} evaluation={evaluation} />);
    expect(screen.getByTestId('hero-facts').props.entering?.getDuration()).toBe(theme.motion.duration.base);
  });
});
