// The hand-off to Google Maps for turn-by-turn navigation. Fika decides when to leave and which way to go;
// the driving itself belongs to the app the commuter already trusts.
import type { LatLng } from '@/contract';

const point = (p: LatLng) => `${p.lat},${p.lng}`;

/**
 * Driving directions for the commute. `via` is a point on the selected route — Google has no way to be handed a
 * route, but a waypoint on it makes Google pick that way rather than its own favourite.
 */
export function directionsUrl(origin: LatLng, destination: LatLng, via?: LatLng): string {
  const params = [
    'api=1',
    `origin=${point(origin)}`,
    `destination=${point(destination)}`,
    ...(via ? [`waypoints=${point(via)}`] : []),
    'travelmode=driving',
  ];
  return `https://www.google.com/maps/dir/?${params.join('&')}`;
}
