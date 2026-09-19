// A route's shape, from Google's encoded polyline to points the map can draw.
import polyline from '@mapbox/polyline';

import type { LatLng } from '@/contract';

/** The route's points, in order. Google encodes them as [lat, lng] pairs. */
export function decodePath(encoded: string): LatLng[] {
  return polyline.decode(encoded).map(([lat, lng]) => ({ lat, lng }));
}

/**
 * The point a fraction of the way along the route, for a label or a marker that should sit on the line.
 * Undefined for a route with no shape, so nothing is drawn rather than drawn off the coast of Africa.
 */
export function pointAlong(path: LatLng[], fraction: number): LatLng | undefined {
  if (path.length < 2) return path[0];
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

/**
 * The point on this route that is furthest from every other route — where this way is most itself, and so where
 * its label belongs. Undefined when the routes run together the whole way and there is no such point.
 */
export function distinctPoint(path: LatLng[], others: LatLng[][]): LatLng | undefined {
  // A label belongs along the way, not on top of the pins at either end of it.
  const inner = path.slice(Math.floor(path.length * 0.15), Math.ceil(path.length * 0.85));
  const mine = sample(inner.length > 1 ? inner : path);
  const rest = others.flatMap((other) => sample(other));
  if (mine.length === 0) return undefined;
  if (rest.length === 0) return pointAlong(path, 0.5);
  let best: LatLng | undefined;
  let furthest = 0;
  for (const p of mine) {
    let nearest = Infinity;
    for (const q of rest) nearest = Math.min(nearest, (p.lat - q.lat) ** 2 + (p.lng - q.lng) ** 2);
    if (nearest > furthest) {
      furthest = nearest;
      best = p;
    }
  }
  return best;
}

// Enough points to find where routes part, few enough to compare every pair of them on each redraw.
function sample(path: LatLng[], count = 48): LatLng[] {
  if (path.length <= count) return path;
  const step = (path.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => path[Math.round(i * step)]);
}
