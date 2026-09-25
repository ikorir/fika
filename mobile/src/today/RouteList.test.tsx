import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { AccessibilityInfo } from 'react-native';

import type { RouteView } from '@/contract';
import { theme } from '@/theme';
import { RouteList, RouteListSkeleton } from '@/today/RouteList';

const route = (over: Partial<RouteView>): RouteView => ({
  id: 'limuru',
  label: 'Limuru Road',
  durationMin: 38,
  trafficDelayMin: 6,
  arriveAt: '2026-09-21T08:40:00+03:00',
  deltaMin: -12,
  deltaKind: 'early',
  recommended: true,
  selected: true,
  polyline: '',
  ...over,
});

const routes = [route({}), route({ id: 'thika', label: 'Thika Road', selected: false, recommended: false })];

beforeEach(() => jest.clearAllMocks());

describe('RouteList', () => {
  it('selects the pressed route with a light tap', async () => {
    const onSelect = jest.fn();
    await render(<RouteList routes={routes} caption="leaving now, 7:45" onSelect={onSelect} />);
    await fireEvent.press(screen.getByRole('radio', { name: /Thika Road/ }));
    expect(onSelect).toHaveBeenCalledWith('thika');
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });
});

describe('RouteList with a toll road (W3)', () => {
  it('adds the toll range to the meta line of the route that has one', async () => {
    const expressway = route({ id: 'nairobi-expressway', label: 'via Nairobi Expressway', durationMin: 34, trafficDelayMin: 0, toll: { fromKes: 170, toKes: 500 } });
    await render(<RouteList routes={[expressway, route({ id: 'thika', label: 'Thika Road', selected: false })]} caption="leaving 7:50" />);
    expect(screen.getByText('34 min · Toll KES 170–500')).toBeOnTheScreen();
    expect(screen.getByText('38 min · 6 min traffic delay')).toBeOnTheScreen();
  });

  it('puts the toll after the traffic delay', async () => {
    const expressway = route({ label: 'via Nairobi Expressway', toll: { fromKes: 170, toKes: 500 } });
    await render(<RouteList routes={[expressway]} caption="leaving 7:50" />);
    expect(screen.getByText('38 min · 6 min traffic delay · Toll KES 170–500')).toBeOnTheScreen();
  });
});

describe('RouteList at large text sizes', () => {
  it('lets the route texts grow to 1.6 times, and cuts a long name with an ellipsis on one line', async () => {
    const long = route({ label: 'Northern Bypass via Kiambu Road and the long way round Ruaka' });
    await render(<RouteList routes={[long]} caption="leaving now, 7:45" />);
    const name = screen.getByText(long.label);
    expect(name.props.numberOfLines).toBe(1);
    expect(name.props.ellipsizeMode ?? 'tail').toBe('tail');
    for (const text of [name, screen.getByText('38 min · 6 min traffic delay'), screen.getByText('12 min early')])
      expect(text.props.maxFontSizeMultiplier).toBe(1.6);
    expect(screen.getByText(/^\d{1,2}:\d{2}$/).props.maxFontSizeMultiplier).toBe(1.6); // the arrival time
  });
});

describe('RouteList in motion', () => {
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

  const selecting = (id: string) => routes.map((r) => ({ ...r, selected: r.id === id }));
  const check = (name: RegExp) => within(screen.getByRole('radio', { name })).getByTestId('radio-check');
  // The scale the check is drawn at, as Reanimated's test setup reports the animated style.
  const scaleOf = (name: RegExp): number => check(name).props.jestAnimatedStyle.value.transform[0].scale;
  const frame = () => act(() => jest.advanceTimersByTime(16));

  it('renders both routes and exposes which one is selected', async () => {
    const { rerender } = await render(<RouteList routes={routes} caption="leaving now, 7:45" />);
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: /Limuru Road/, selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: /Thika Road/, selected: false })).toBeOnTheScreen();

    await rerender(<RouteList routes={selecting('thika')} caption="leaving now, 7:45" />);
    expect(screen.getByRole('radio', { name: /Thika Road/, selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: /Limuru Road/, selected: false })).toBeOnTheScreen();
  });

  it('gives every row the shared layout transition, and none with reduce motion on', async () => {
    const rows = () => screen.getAllByTestId('route-row');
    const { unmount } = await render(<RouteList routes={routes} caption="leaving now, 7:45" />);
    expect(rows()).toHaveLength(2);
    for (const row of rows()) expect(row.props.layout?.getDuration()).toBe(theme.motion.duration.base);
    await unmount();

    reduceMotion = true;
    await render(<RouteList routes={routes} caption="leaving now, 7:45" />);
    expect(rows()).toHaveLength(2);
    for (const row of rows()) expect(row.props.layout).toBeUndefined();
  });

  it('shows the selected check at full size when the list first shows', async () => {
    await render(<RouteList routes={routes} caption="leaving now, 7:45" />);
    expect(check(/Limuru Road/)).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
    expect(check(/Thika Road/)).toHaveAnimatedStyle({ transform: [{ scale: 0 }] });
  });

  it('springs the check in from nothing when a route is selected', async () => {
    const { rerender } = await render(<RouteList routes={routes} caption="leaving now, 7:45" />);
    await rerender(<RouteList routes={selecting('thika')} caption="leaving now, 7:45" />);
    await frame();
    expect(scaleOf(/Limuru Road/)).toBe(0);
    expect(scaleOf(/Thika Road/)).toBeGreaterThan(0);
    expect(scaleOf(/Thika Road/)).toBeLessThan(0.3);
    await act(() => jest.advanceTimersByTime(theme.motion.duration.base / 2));
    expect(scaleOf(/Thika Road/)).toBeGreaterThan(0.3);
    await act(() => jest.advanceTimersByTime(2000));
    expect(scaleOf(/Thika Road/)).toBe(1);
  });

  it("rolls a route's arrival time to its new value", async () => {
    const { rerender } = await render(<RouteList routes={routes} caption="leaving now, 7:45" />);
    const later = routes.map((r) => (r.id === 'thika' ? { ...r, arriveAt: '2026-09-21T08:52:00+03:00' } : r));
    await rerender(<RouteList routes={later} caption="leaving now, 7:45" />);
    const thika = within(screen.getByRole('radio', { name: /Thika Road/ }));
    expect(thika.getByText('8:52')).toBeOnTheScreen();
    expect(thika.getByTestId('rolling', { includeHiddenElements: true })).toBeTruthy();
    expect(within(screen.getByRole('radio', { name: /Limuru Road/ })).queryByTestId('rolling')).toBeNull();
    await act(() => jest.advanceTimersByTime(theme.motion.duration.base));
    expect(thika.queryByTestId('rolling', { includeHiddenElements: true })).toBeNull();
    expect(thika.getByText('8:52')).toBeOnTheScreen();
  });

  it('shows the check at once with reduce motion on', async () => {
    reduceMotion = true;
    const { rerender } = await render(<RouteList routes={routes} caption="leaving now, 7:45" />);
    await rerender(<RouteList routes={selecting('thika')} caption="leaving now, 7:45" />);
    await frame();
    expect(scaleOf(/Thika Road/)).toBe(1);
    expect(scaleOf(/Limuru Road/)).toBe(0);
  });
});

describe('RouteListSkeleton', () => {
  beforeEach(() => jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false));
  afterEach(() => jest.restoreAllMocks());

  it('is a route card of three placeholder rows at the real row height', async () => {
    await render(<RouteListSkeleton />);
    const rows = screen.getAllByTestId('route-row-skeleton', { includeHiddenElements: true });
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row).toHaveStyle({ minHeight: theme.size.routeRow });
    expect(screen.getByTestId('route-card-skeleton', { includeHiddenElements: true })).toHaveStyle({
      borderRadius: theme.radius.card,
      backgroundColor: theme.color.surface,
    });
  });

  it('fades out with the shared exit preset when the routes arrive', async () => {
    await render(<RouteListSkeleton />);
    const card = screen.getByTestId('route-card-skeleton', { includeHiddenElements: true });
    expect(card.props.exiting?.getDuration()).toBe(theme.motion.duration.fast);
  });
});

describe('RouteList arriving', () => {
  beforeEach(() => jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false));
  afterEach(() => jest.restoreAllMocks());

  it('fades in with the shared enter preset and moves with the layout preset', async () => {
    await render(<RouteList routes={routes} caption="leaving now, 7:45" />);
    const card = screen.getByTestId('route-card');
    expect(card.props.entering?.getDuration()).toBe(theme.motion.duration.base);
    expect(card.props.exiting?.getDuration()).toBe(theme.motion.duration.fast);
    expect(card.props.layout?.getDuration()).toBe(theme.motion.duration.base);
  });
});
