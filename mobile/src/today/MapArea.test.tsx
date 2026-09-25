import polyline from '@mapbox/polyline';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { AccessibilityInfo, Platform, processColor, StyleSheet } from 'react-native';
import MapView from 'react-native-maps';

import type { Evaluation, RouteView } from '@/contract';
import { seedCommute } from '@/seed';
import { theme } from '@/theme';
import { fitRegion } from '@/today/camera';
import { MapArea } from '@/today/MapArea';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const { color, motion } = theme;
const size = { width: 390, height: 250 };
const padding = { top: 30, right: 12, bottom: 20, left: 12 }; // the edge padding the map has always fitted with

// Two ways across Nairobi that share their ends and part in the middle.
const waiyaki: [number, number][] = [[-1.2676, 36.8108], [-1.2601, 36.7801], [-1.2702, 36.7402], [-1.3197, 36.7076]];
const gichuru: [number, number][] = [[-1.2676, 36.8108], [-1.2905, 36.7902], [-1.3102, 36.7703], [-1.3197, 36.7076]];
const points = (path: [number, number][]) => path.map(([latitude, longitude]) => ({ latitude, longitude }));

const route = (over: Partial<RouteView>): RouteView => ({
  id: 'waiyaki',
  label: 'Waiyaki Way',
  durationMin: 38,
  trafficDelayMin: 4,
  arriveAt: '2026-09-21T08:40:00+03:00',
  deltaMin: -10,
  deltaKind: 'early',
  recommended: true,
  selected: true,
  polyline: polyline.encode(waiyaki),
  ...over,
});
const routes = (selected: 'waiyaki' | 'gichuru', gichuruPath = gichuru): RouteView[] => [
  route({ selected: selected === 'waiyaki' }),
  route({
    id: 'gichuru',
    label: 'James Gichuru Rd',
    durationMin: 42,
    recommended: false,
    selected: selected === 'gichuru',
    polyline: polyline.encode(gichuruPath),
  }),
];

const handlers = { onSelectRoute: jest.fn(), onRefresh: jest.fn(), onDemo: jest.fn() };
const Area = (props: { routes: RouteView[]; state?: Evaluation['state']; incidentRouteId?: string }) => (
  <MapArea commute={seedCommute} demoOn={false} {...handlers} {...props} />
);

const hosts = (type: string) => screen.container.queryAll((n) => n.type === type);
const mapView = () => hosts('MapView')[0];
const later = (ms: number) => act(() => jest.advanceTimersByTime(ms));

/** Renders the map, lays it out at 390 × 250 and says it is ready, as the phone does. */
async function showMap(element: React.ReactElement) {
  const view = await render(element);
  await act(async () => {}); // the phone's reduce motion answer
  await fireEvent(screen.getByTestId('map-area'), 'layout', { nativeEvent: { layout: size } });
  await fireEvent(mapView(), 'mapReady');
  return view;
}

let reduceMotion = false;
let toRegion: jest.SpyInstance;
let toCamera: jest.SpyInstance;
beforeEach(() => {
  reduceMotion = false;
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(() => Promise.resolve(reduceMotion));
  toRegion = jest.spyOn(MapView.prototype, 'animateToRegion');
  toCamera = jest.spyOn(MapView.prototype, 'animateCamera');
  jest.useFakeTimers();
});
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('MapArea camera', () => {
  const all = (path = gichuru) => fitRegion([...points(waiyaki), ...points(path)], size, padding);

  it('fits every route once the map is laid out and ready, easing over the slow duration', async () => {
    await render(<Area routes={routes('waiyaki')} state="on_time" />);
    expect(toRegion).not.toHaveBeenCalled(); // no fit into a map with no size yet
    await fireEvent(screen.getByTestId('map-area'), 'layout', { nativeEvent: { layout: size } });
    expect(toRegion).not.toHaveBeenCalled();
    await fireEvent(mapView(), 'mapReady');
    expect(toRegion).toHaveBeenCalledTimes(1);
    expect(toRegion).toHaveBeenCalledWith(all(), motion.duration.slow);
    expect(toCamera).not.toHaveBeenCalled();
  });

  it('fits every route again, eased, when the set of routes changes', async () => {
    const view = await showMap(<Area routes={routes('waiyaki')} state="on_time" />);
    const detour: [number, number][] = [[-1.2676, 36.8108], [-1.33, 36.79], [-1.3197, 36.7076]];
    await view.rerender(<Area routes={routes('waiyaki', detour)} state="on_time" />);
    expect(toRegion).toHaveBeenCalledTimes(2);
    expect(toRegion).toHaveBeenLastCalledWith(all(detour), motion.duration.slow);
  });

  it('leaves the camera alone when only the numbers or the state change', async () => {
    const view = await showMap(<Area routes={routes('waiyaki')} state="on_time" />);
    await view.rerender(<Area routes={routes('waiyaki').map((r) => ({ ...r, durationMin: r.durationMin + 25 }))} state="at_risk" />);
    await later(5000);
    expect(toRegion).toHaveBeenCalledTimes(1);
    expect(toCamera).not.toHaveBeenCalled();
  });

  it('eases to fit the selected route, with the same padding, when a route is selected', async () => {
    const view = await showMap(<Area routes={routes('waiyaki')} state="on_time" />);
    await view.rerender(<Area routes={routes('gichuru')} state="on_time" />);
    expect(toRegion).toHaveBeenLastCalledWith(fitRegion(points(gichuru), size, padding), motion.duration.slow);
    expect(toCamera).not.toHaveBeenCalled();
    expect(mapView().props.pitchEnabled).toBe(false);
  });

  it('flies a switch: tilts to 45° on the way, settles flat on the new route, then stops', async () => {
    const view = await showMap(<Area routes={routes('waiyaki')} state="at_risk" incidentRouteId="waiyaki" />);
    toRegion.mockClear();
    const target = fitRegion(points(gichuru), size, padding);

    // "Switch to James Gichuru Rd": the selection leaves the route at risk for one on time.
    await view.rerender(<Area routes={routes('gichuru')} state="on_time" incidentRouteId="waiyaki" />);
    expect(mapView().props.pitchEnabled).toBe(true); // Apple Maps shows pitch only while this is on
    await later(0);
    expect(toCamera).toHaveBeenCalledTimes(1);
    expect(toCamera).toHaveBeenCalledWith(
      { center: { latitude: target.latitude, longitude: target.longitude }, pitch: 45, heading: 0 },
      { duration: motion.duration.slow },
    );
    expect(toRegion).not.toHaveBeenCalled();

    await later(motion.duration.slow);
    expect(toRegion).toHaveBeenCalledTimes(1);
    expect(toRegion).toHaveBeenCalledWith(target, motion.duration.slow); // a region is drawn looking straight down

    await later(motion.duration.slow + motion.duration.base);
    expect(mapView().props.pitchEnabled).toBe(false); // flat, and no tilting from here on

    await later(60_000);
    expect(toCamera).toHaveBeenCalledTimes(1);
    expect(toRegion).toHaveBeenCalledTimes(1);
  });

  it('flies a switch out of the late state too', async () => {
    const view = await showMap(<Area routes={routes('waiyaki')} state="late" />);
    await view.rerender(<Area routes={routes('gichuru')} state="on_time" />);
    await later(0);
    expect(toCamera).toHaveBeenCalledWith(expect.objectContaining({ pitch: 45 }), { duration: motion.duration.slow });
  });

  it('moves instantly with reduce motion, the switch included, and never tilts', async () => {
    reduceMotion = true;
    const view = await showMap(<Area routes={routes('waiyaki')} state="at_risk" />);
    expect(toRegion).toHaveBeenLastCalledWith(all(), 0);
    await view.rerender(<Area routes={routes('gichuru')} state="on_time" />);
    expect(mapView().props.pitchEnabled).toBe(false);
    expect(toRegion).toHaveBeenLastCalledWith(fitRegion(points(gichuru), size, padding), 0);
    await later(60_000);
    expect(toCamera).not.toHaveBeenCalled();
    expect(toRegion).toHaveBeenCalledTimes(2);
  });
});

describe('MapArea on Android with no Maps key', () => {
  it('shows the fallback note with the header controls, and nothing throws', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const view = await render(<Area routes={routes('waiyaki')} state="at_risk" incidentRouteId="waiyaki" />);
    expect(screen.getByText('Map unavailable: this build has no Google Maps key.')).toBeTruthy();
    expect(hosts('MapView')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Edit commute' })).toBeTruthy();
    // A switch with no map to move.
    await view.rerender(<Area routes={routes('gichuru')} state="on_time" incidentRouteId="waiyaki" />);
    await later(60_000);
    expect(toRegion).not.toHaveBeenCalled();
    expect(toCamera).not.toHaveBeenCalled();
  });
});

describe('MapArea look', () => {
  const drawnLines = () => hosts('Polyline').filter((l) => l.props.strokeWidth !== 22); // not the wide invisible hit lines

  it('draws a glow under the selected route: three times as wide, accent at 20%', async () => {
    await showMap(<Area routes={routes('gichuru')} state="on_time" />);
    const drawn = drawnLines();
    const glows = drawn.filter((l) => l.props.strokeColor === 'rgba(242,140,56,0.2)');
    expect(glows).toHaveLength(1);
    const selected = drawn.find((l) => l.props.strokeColor === color.accent)!;
    expect(glows[0].props.strokeWidth).toBe(selected.props.strokeWidth * 3);
    expect(glows[0].props.coordinates).toEqual(selected.props.coordinates);
    expect(glows[0].props.coordinates).toEqual(points(gichuru));
    // Underneath: drawn just before the selected line, and below it.
    expect(drawn.indexOf(glows[0])).toBe(drawn.indexOf(selected) - 1);
    expect(glows[0].props.zIndex).toBeLessThan(selected.props.zIndex);
  });

  it('fades the foot of the map into the screen’s black over 48 pt, letting touches through', async () => {
    await showMap(<Area routes={routes('waiyaki')} state="on_time" />);
    const fade = screen.getByTestId('map-fade');
    expect(fade.props.pointerEvents).toBe('none');
    expect(fade.props.colors).toEqual([processColor('rgba(0,0,0,0)'), processColor(color.bg)]);
    expect(fade).toHaveStyle({ position: 'absolute', left: 0, right: 0, bottom: 0, height: 48 });
  });

  it('draws each ETA bubble as one SVG shape with a tail down to the road, text and colours as before', async () => {
    await showMap(<Area routes={routes('gichuru')} state="on_time" incidentRouteId="waiyaki" />);
    const selected = screen.getByText('42 min');
    const left = screen.getByText('38 min'); // the road the accident is on, switched away from
    expect(selected).toHaveStyle({ color: color.onAccent });
    expect(left).toHaveStyle({ color: color.atRisk });
    for (const text of [selected, left]) expect(text.props.maxFontSizeMultiplier).toBe(1.2);

    // The outline is drawn to the label's measured size, with the tail's tip centred 5 pt below it.
    await fireEvent(selected.parent!, 'layout', { nativeEvent: { layout: { width: 50, height: 24 } } });
    await fireEvent(left.parent!, 'layout', { nativeEvent: { layout: { width: 46, height: 22 } } });
    const shapes = screen.getAllByTestId('eta-bubble-shape');
    expect(shapes).toHaveLength(2);
    const paths = shapes.map((s) => s.queryAll((n) => typeof n.props.d === 'string')[0]);
    const fillOf = (p: (typeof paths)[number]) => p.props.fill.payload; // react-native-svg's processed colour
    const fills = paths.map(fillOf);
    expect(fills).toContainEqual(processColor(color.accent));
    expect(fills).toContainEqual(processColor(color.atRiskTint));
    const onPath = paths.find((p) => fillOf(p) === processColor(color.accent))!;
    expect(onPath.props.d).toContain('L25 29'); // tip at the middle of 50, 24 + 5 down
  });

  it('shows each bubble’s duration inside its marker, over its shape, before and after the label is measured', async () => {
    await showMap(<Area routes={routes('gichuru')} state="on_time" incidentRouteId="waiyaki" />);
    const etaMarkers = () => hosts('Marker').filter((m) => m.queryAll((n) => n.props.testID === 'eta-bubble').length > 0);
    const expectTextOverShape = () => {
      expect(etaMarkers()).toHaveLength(2);
      for (const marker of etaMarkers()) {
        const text = within(marker).getByText(/^\d+ min$/);
        expect(text.props.maxFontSizeMultiplier).toBe(1.2);
        // Apple Maps stacks a marker's views in the order they arrive, so the shape must be there first and come first.
        const layers = marker.queryAll((n) => n.props.testID === 'eta-bubble-shape' || n === text);
        expect(layers.map((n) => n.props.testID ?? 'text')).toEqual(['eta-bubble-shape', 'text']);
      }
    };
    expectTextOverShape();
    expect(within(etaMarkers()[0]).queryAllByText(/min$/)).toHaveLength(1);
    for (const text of screen.getAllByText(/^\d+ min$/))
      await fireEvent(text.parent!, 'layout', { nativeEvent: { layout: { width: 48, height: 22 } } });
    expectTextOverShape();
    expect(screen.getByText('42 min')).toBeTruthy();
    expect(screen.getByText('38 min')).toBeTruthy();
    await later(1000); // tracking off: the text is still there
    expectTextOverShape();
  });

  it('gives every marker one body view that React Native keeps, so Apple Maps keeps its layers in order', async () => {
    await showMap(<Area routes={routes('waiyaki')} state="at_risk" incidentRouteId="waiyaki" />);
    const markers = hosts('Marker');
    expect(markers).toHaveLength(5);
    for (const marker of markers) {
      const bodies = marker.children.filter((c) => typeof c !== 'string');
      expect(bodies).toHaveLength(1);
      expect(bodies[0]).toHaveProp('collapsable', false);
    }
    // The pins keep their rings and the accident its pulse.
    expect(screen.getAllByTestId('pin-halo')).toHaveLength(2);
    expect(screen.getAllByTestId('pin-ring')).toHaveLength(2);
    expect(within(screen.getByTestId('incident')).getByTestId('incident-pulse')).toBeTruthy();
  });

  it('puts the bubble’s tail tip on the route', async () => {
    await showMap(<Area routes={routes('waiyaki')} state="on_time" />);
    const bubbles = hosts('Marker').filter((m) => m.queryAll((n) => n.props.maxFontSizeMultiplier === 1.2).length > 0);
    expect(bubbles).toHaveLength(2);
    for (const bubble of bubbles) expect(bubble.props.anchor).toEqual({ x: 0.5, y: 1 });
  });

  it('rings the origin and destination: 2 pt of the screen’s black, then a soft halo at 30% of their colour', async () => {
    await showMap(<Area routes={routes('waiyaki')} state="on_time" />);
    const halos = screen.getAllByTestId('pin-halo');
    expect(halos).toHaveLength(2);
    expect(halos[0]).toHaveStyle({ backgroundColor: 'rgba(255,255,255,0.3)' }); // origin, white
    expect(halos[1]).toHaveStyle({ backgroundColor: 'rgba(242,140,56,0.3)' }); // destination, accent
    for (const ring of screen.getAllByTestId('pin-ring')) expect(ring).toHaveStyle({ padding: 2, backgroundColor: color.bg });
  });

  it('pulses the incident marker while an accident is simulated', async () => {
    await showMap(<Area routes={routes('waiyaki')} state="at_risk" incidentRouteId="waiyaki" />);
    const ring = () => screen.getByTestId('incident-pulse').props.jestAnimatedStyle.value;
    await later(motion.duration.slow);
    const first = ring();
    await later(motion.duration.slow);
    const second = ring();
    expect(second.opacity).toBeLessThan(first.opacity);
    expect(second.transform[0].scale).toBeGreaterThan(first.transform[0].scale);
    expect(screen.getByTestId('incident-pulse')).toHaveStyle({ backgroundColor: color.atRisk });
  });

  it('shows no incident marker, and so no pulse, without a simulated accident', async () => {
    await showMap(<Area routes={routes('waiyaki')} state="on_time" />);
    expect(screen.queryByTestId('incident-pulse')).toBeNull();
  });

  it('holds the incident ring still with reduce motion', async () => {
    reduceMotion = true;
    await showMap(<Area routes={routes('waiyaki')} state="late" incidentRouteId="waiyaki" />);
    const ring = () => screen.getByTestId('incident-pulse').props.jestAnimatedStyle.value;
    await later(16);
    const first = ring();
    await later(motion.duration.slow * 2);
    expect(ring()).toEqual(first);
    expect(first.opacity).toBeGreaterThan(0); // still there, only still
    expect(first.transform[0].scale).toBeGreaterThan(1);
    expect(screen.getByTestId('incident-pulse')).toHaveStyle({ backgroundColor: color.late });
  });

  it('stops redrawing every marker a moment after it is drawn', async () => {
    await showMap(<Area routes={routes('waiyaki')} state="at_risk" incidentRouteId="waiyaki" />);
    const markers = () => hosts('Marker');
    expect(markers()).toHaveLength(5); // origin, destination, two ETA bubbles, the accident
    for (const m of markers()) expect(m.props.tracksViewChanges).toBe(true);
    await later(1000);
    for (const m of markers()) expect(m.props.tracksViewChanges).toBe(false);
  });
});
