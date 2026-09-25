import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import type { RouteView } from '@/contract';
import { RouteList } from '@/today/RouteList';

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
