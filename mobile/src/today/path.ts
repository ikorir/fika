// A route's shape, from Google's encoded polyline to points the map can draw.
import polyline from '@mapbox/polyline';

import type { LatLng } from '@/contract';

/** The route's points, in order. Google encodes them as [lat, lng] pairs. */
export function decodePath(encoded: string): LatLng[] {
  return polyline.decode(encoded).map(([lat, lng]) => ({ lat, lng }));
}

/** The point a fraction of the way along the route, for a label or a marker that should sit on the line. */
export function pointAlong(path: LatLng[], fraction: number): LatLng {
  if (path.length < 2) return path[0] ?? { lat: 0, lng: 0 };
  const legs = path.slice(1).map((p, i) => Math.hypot(p.lat - path[i].lat, p.lng - path[i].lng));
  const total = legs.reduce((a, b) => a + b, 0);
  if (total === 0) return path[0];
  let left = total * Math.min(Math.max(fraction, 0), 1);
  for (let i = 0; i < legs.length; i++) {
    if (left > legs[i]) {
      left -= legs[i];
      continue;
    }
    const t = legs[i] === 0 ? 0 : left / legs[i];
    return {
      lat: path[i].lat + (path[i + 1].lat - path[i].lat) * t,
      lng: path[i].lng + (path[i + 1].lng - path[i].lng) * t,
    };
  }
  return path[path.length - 1];
}
