import { cameraMove, cameraSteps, type CameraView, FLY_PITCH, fitRegion, moveEnd } from '@/today/camera';
import { theme } from '@/theme';

const { duration } = theme.motion;
const size = { width: 390, height: 250 };
const padding = { top: 30, right: 12, bottom: 20, left: 12 };

// Where a point lands on screen for a region, the way both map SDKs read one: its corners are the centre ± half the
// deltas, and the map between them is Web Mercator.
const y = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
function onScreen(region: ReturnType<typeof fitRegion>, p: { latitude: number; longitude: number }) {
  const north = y(region.latitude + region.latitudeDelta / 2);
  const south = y(region.latitude - region.latitudeDelta / 2);
  const west = region.longitude - region.longitudeDelta / 2;
  return {
    x: ((p.longitude - west) / region.longitudeDelta) * size.width,
    y: ((north - y(p.latitude)) / (north - south)) * size.height,
  };
}

// A commute across Nairobi, wider than it is tall, like the real ones.
const westlands = { latitude: -1.2676, longitude: 36.8108 };
const upperHill = { latitude: -1.3, longitude: 36.8172 };
const karen = { latitude: -1.3197, longitude: 36.7076 };
const route = [westlands, upperHill, karen];

describe('fitRegion', () => {
  it('keeps every point inside the padded frame', () => {
    const region = fitRegion(route, size, padding);
    for (const p of route) {
      const at = onScreen(region, p);
      expect(at.x).toBeGreaterThanOrEqual(padding.left - 0.01);
      expect(at.x).toBeLessThanOrEqual(size.width - padding.right + 0.01);
      expect(at.y).toBeGreaterThanOrEqual(padding.top - 0.01);
      expect(at.y).toBeLessThanOrEqual(size.height - padding.bottom + 0.01);
    }
  });

  it('fills the frame on the tighter side, so the routes are as big as the padding allows', () => {
    const region = fitRegion(route, size, padding);
    const xs = route.map((p) => onScreen(region, p).x);
    const ys = route.map((p) => onScreen(region, p).y);
    const fillsWidth = Math.abs(Math.min(...xs) - padding.left) < 0.01 && Math.abs(Math.max(...xs) - (size.width - padding.right)) < 0.01;
    const fillsHeight = Math.abs(Math.min(...ys) - padding.top) < 0.01 && Math.abs(Math.max(...ys) - (size.height - padding.bottom)) < 0.01;
    expect(fillsWidth || fillsHeight).toBe(true);
  });

  it('has the map’s own shape, so neither SDK widens it on its own', () => {
    const region = fitRegion(route, size, padding);
    const tall = y(region.latitude + region.latitudeDelta / 2) - y(region.latitude - region.latitudeDelta / 2);
    const wide = (region.longitudeDelta * Math.PI) / 180;
    expect(wide / tall).toBeCloseTo(size.width / size.height, 6);
  });

  it('sits the routes lower when the top padding is the larger, as under the header controls', () => {
    const even = fitRegion(route, size, { top: 25, right: 12, bottom: 25, left: 12 });
    const uneven = fitRegion(route, size, { top: 40, right: 12, bottom: 10, left: 12 });
    expect(uneven.latitude).toBeGreaterThan(even.latitude);
  });

  it('gives a single point a street-level view instead of the closest zoom there is', () => {
    const region = fitRegion([westlands], size, padding);
    expect(region.latitude).toBeCloseTo(westlands.latitude + (region.latitudeDelta * 5) / 250, 4);
    expect(region.longitude).toBeCloseTo(westlands.longitude, 6);
    // About 500 m across the map's short side.
    expect(region.latitudeDelta).toBeGreaterThan(0.0049);
    expect(region.latitudeDelta).toBeLessThan(0.0051);
  });
});

describe('cameraMove', () => {
  const routes = {};
  const view = (over: Partial<CameraView> = {}): CameraView => ({ routes, selectedId: 'a', state: 'on_time', size, ...over });

  it('fits every route the first time the map can show them', () => {
    expect(cameraMove(undefined, view())).toBe('all');
  });

  it('fits every route again when the set of routes changes', () => {
    expect(cameraMove(view(), view({ routes: {} }))).toBe('all');
  });

  it('fits every route again when the map changes size', () => {
    expect(cameraMove(view(), view({ size: { width: 390, height: 300 } }))).toBe('all');
  });

  it('fits the selected route when the selection changes', () => {
    expect(cameraMove(view(), view({ selectedId: 'b' }))).toBe('selected');
    expect(cameraMove(view({ state: 'at_risk' }), view({ selectedId: 'b', state: 'at_risk' }))).toBe('selected');
  });

  it('flies when the selection moves off a route at risk or late onto one that is on time: "Switch to …"', () => {
    expect(cameraMove(view({ state: 'at_risk' }), view({ selectedId: 'b', state: 'on_time' }))).toBe('switch');
    expect(cameraMove(view({ state: 'late' }), view({ selectedId: 'b', state: 'on_time' }))).toBe('switch');
  });

  it('stays put when only the state or nothing changes', () => {
    expect(cameraMove(view(), view())).toBeNull();
    expect(cameraMove(view(), view({ state: 'at_risk' }))).toBeNull();
  });

  it('fits every route when nothing is selected any more', () => {
    expect(cameraMove(view(), view({ selectedId: undefined }))).toBe('all');
  });
});

describe('cameraSteps', () => {
  const region = fitRegion(route, size, padding);

  it('eases to the fit over the slow duration', () => {
    expect(cameraSteps('all', region, false)).toEqual([{ at: 0, duration: duration.slow, region }]);
    expect(cameraSteps('selected', region, false)).toEqual([{ at: 0, duration: duration.slow, region }]);
  });

  it('tilts the switch to 45° on the way, then settles flat on the fit', () => {
    const steps = cameraSteps('switch', region, false);
    expect(steps).toEqual([
      {
        at: 0,
        duration: duration.slow,
        camera: { center: { latitude: region.latitude, longitude: region.longitude }, pitch: FLY_PITCH, heading: 0 },
      },
      { at: duration.slow, duration: duration.slow, region },
    ]);
    expect(FLY_PITCH).toBe(45);
    // The last step is a region: both SDKs draw a region looking straight down.
    expect(steps.at(-1)).toHaveProperty('region');
  });

  it('jumps straight to the fit with reduce motion, the switch included', () => {
    for (const move of ['all', 'selected', 'switch'] as const)
      expect(cameraSteps(move, region, true)).toEqual([{ at: 0, duration: 0, region }]);
  });

  it('ends: every move is a fixed number of steps with a known end', () => {
    expect(moveEnd(cameraSteps('all', region, false))).toBe(duration.slow);
    expect(moveEnd(cameraSteps('switch', region, false))).toBe(duration.slow * 2);
    expect(moveEnd(cameraSteps('switch', region, true))).toBe(0);
  });
});
