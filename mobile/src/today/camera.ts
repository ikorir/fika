// Where the map's camera goes, as data: which move a change on the Today screen calls for, the region that fits a set
// of points, and the steps each move takes. MapArea plays the steps on the map; nothing here touches it.
import type { Camera, EdgePadding, LatLng, Region } from 'react-native-maps';

import type { Evaluation } from '@/contract';
import { theme } from '@/theme';

const { duration } = theme.motion;

export type Size = { width: number; height: number };

/** What the map is showing, as far as the camera cares. `routes` is compared by identity: a new set of lines. */
export type CameraView = { routes: unknown; selectedId?: string; state?: Evaluation['state']; size: Size };

/** Fit every route, fit the selected one, or fly to the selected one after "Switch to …". */
export type Move = 'all' | 'selected' | 'switch';

/** One command to the map, `at` ms after the move starts. A region is drawn looking straight down. */
export type CameraStep = { at: number; duration: number } & ({ region: Region } | { camera: Partial<Camera> });

/** How far the camera tilts halfway through a switch. */
export const FLY_PITCH = 45;

/** The narrowest the map's short side gets, about 500 m: a route with no length gets a street, not the closest zoom. */
const MIN_SPAN = 0.005;

// Web Mercator in degrees, the projection both Apple and Google Maps draw, so a fit holds away from the equator too.
const toY = (lat: number) => (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI;
const toLat = (y: number) => (Math.atan(Math.exp((y * Math.PI) / 180)) * 360) / Math.PI - 90;

/**
 * The region that shows every point inside the map less its padding, the tighter side filling it. The region has the
 * map's own shape, so the SDK takes it as it is instead of widening it. Both SDKs read a region as its centre ± half
 * the deltas, so the centre is the middle of the latitudes, not of the projection.
 */
export function fitRegion(points: LatLng[], size: Size, padding: EdgePadding): Region {
  const xs = points.map((p) => p.longitude);
  const ys = points.map((p) => toY(p.latitude));
  const [west, east] = [Math.min(...xs), Math.max(...xs)];
  const [south, north] = [Math.min(...ys), Math.max(...ys)];
  const inner = {
    width: Math.max(size.width - padding.left - padding.right, 1),
    height: Math.max(size.height - padding.top - padding.bottom, 1),
  };
  // Degrees per point, the same across and down: whichever way the routes are the tighter fit sets it.
  const scale = Math.max((east - west) / inner.width, (north - south) / inner.height, MIN_SPAN / Math.min(size.width, size.height));
  // The padding is uneven (more under the header controls), so the map's middle sits off the routes' middle.
  const x = (west + east) / 2 + (scale * (padding.right - padding.left)) / 2;
  const y = (south + north) / 2 - (scale * (padding.bottom - padding.top)) / 2;
  const top = toLat(y + (scale * size.height) / 2);
  const bottom = toLat(y - (scale * size.height) / 2);
  return { latitude: (top + bottom) / 2, longitude: x, latitudeDelta: top - bottom, longitudeDelta: scale * size.width };
}

/**
 * The move a change calls for, or null for none. A new set of routes or a new map size fits them all; a new selection
 * fits that route. A selection that leaves a route at risk or late for one on time is "Switch to …", or its route
 * row, and flies.
 */
export function cameraMove(before: CameraView | undefined, now: CameraView): Move | null {
  const resized = before && (before.size.width !== now.size.width || before.size.height !== now.size.height);
  if (!before || before.routes !== now.routes || resized) return 'all';
  if (before.selectedId === now.selectedId) return null;
  if (!now.selectedId) return 'all';
  if ((before.state === 'at_risk' || before.state === 'late') && now.state === 'on_time') return 'switch';
  return 'selected';
}

/**
 * The steps of a move to `region`. A fit eases there over the slow duration. A switch first tilts to `FLY_PITCH`
 * over the new route's middle, then settles flat on the fit. With reduce motion every move is one instant step.
 */
export function cameraSteps(move: Move, region: Region, reduceMotion: boolean): CameraStep[] {
  if (reduceMotion) return [{ at: 0, duration: 0, region }];
  if (move !== 'switch') return [{ at: 0, duration: duration.slow, region }];
  const center = { latitude: region.latitude, longitude: region.longitude };
  return [
    { at: 0, duration: duration.slow, camera: { center, pitch: FLY_PITCH, heading: 0 } },
    { at: duration.slow, duration: duration.slow, region },
  ];
}

/** When the last step of a move is over. */
export function moveEnd(steps: CameraStep[]): number {
  return Math.max(0, ...steps.map((s) => s.at + s.duration));
}
