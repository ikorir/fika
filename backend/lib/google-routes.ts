// Google Routes API (computeRoutes), driving with traffic. No decision logic here.
import type { LatLng, Route } from "@/lib/contract";

const ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";
const FIELD_MASK = [
  "routes.duration",
  "routes.staticDuration",
  "routes.distanceMeters",
  "routes.description",
  "routes.polyline.encodedPolyline",
].join(",");
const TIMEOUT_MS = 10_000;

export type GoogleRoute = {
  duration?: string; // "2700s"
  staticDuration?: string;
  distanceMeters?: number;
  description?: string; // main road, e.g. "Waiyaki Way"
  polyline?: { encodedPolyline?: string };
};

export class GoogleRoutesError extends Error {}

const seconds = (d: string | undefined) => Math.round(parseFloat(d ?? "0")) || 0;
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Google's routes as contract Routes. The id is a slug of the description, so the app can match a route across samples. */
export function toRoutes(google: GoogleRoute[]): Route[] {
  const seen = new Map<string, number>();
  return google.slice(0, 3).map((g, i) => {
    const description = g.description?.trim();
    const base = (description && slug(description)) || `route-${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return {
      id: n === 1 ? base : `${base}-${n}`,
      label: description ? `via ${description}` : `Route ${i + 1}`,
      durationSec: seconds(g.duration),
      staticDurationSec: seconds(g.staticDuration),
      distanceM: g.distanceMeters ?? 0,
      polyline: g.polyline?.encodedPolyline ?? "",
    };
  });
}

const waypoint = ({ lat, lng }: LatLng) => ({ location: { latLng: { latitude: lat, longitude: lng } } });

/** Up to 3 driving routes. Omit departAt to leave now; Google rejects departure times in the past. */
export async function computeRoutes(
  req: { origin: LatLng; destination: LatLng; departAt?: Date },
  apiKey: string,
): Promise<Route[]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELD_MASK },
    body: JSON.stringify({
      origin: waypoint(req.origin),
      destination: waypoint(req.destination),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE_OPTIMAL",
      computeAlternativeRoutes: true,
      ...(req.departAt && { departureTime: req.departAt.toISOString() }),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => null)) as
    | { routes?: GoogleRoute[]; error?: { message?: string } }
    | null;
  if (!res.ok) throw new GoogleRoutesError(`Google Routes ${res.status}: ${json?.error?.message ?? res.statusText}`);
  return toRoutes(json?.routes ?? []);
}
