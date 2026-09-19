// Google Routes API (computeRoutes), driving with traffic. No decision logic here.
import type { LatLng, Route } from "@/lib/contract";

const ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";
const FIELD_MASK = [
  "routes.duration",
  "routes.staticDuration",
  "routes.distanceMeters",
  "routes.description",
  "routes.polyline.encodedPolyline",
  "routes.legs.steps.distanceMeters",
  "routes.legs.steps.navigationInstruction.instructions",
].join(",");
const TIMEOUT_MS = 10_000;

export type GoogleRoute = {
  duration?: string; // "2700s"
  staticDuration?: string;
  distanceMeters?: number;
  description?: string; // e.g. "A104" or "Nairobi Expy/A8"; varies between calls for the same route
  polyline?: { encodedPolyline?: string };
  legs?: { steps?: GoogleStep[] }[];
};
type GoogleStep = { distanceMeters?: number; navigationInstruction?: { instructions?: string } };

export class GoogleRoutesError extends Error {}

const seconds = (d: string | undefined) => Math.round(parseFloat(d ?? "0")) || 0;
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const ABBREVIATIONS: Record<string, string> = {
  Ave: "Avenue",
  Blvd: "Boulevard",
  Dr: "Drive",
  Expy: "Expressway",
  Hwy: "Highway",
  Ln: "Lane",
  Rd: "Road",
  St: "Street",
  Wy: "Way",
};
const isRouteNumber = (name: string) => /^[A-Z]\d+$/.test(name);

/** "Waiyaki Wy/A104" → ["Waiyaki Way"]; a bare "A104" is kept when there is no name. */
function roadNames(road: string): string[] {
  const names = road
    .split("/")
    .map((n) => n.trim().replace(/[A-Za-z]+$/, (w) => ABBREVIATIONS[w] ?? w))
    .filter((n) => /^[A-Z0-9]/.test(n));
  const proper = names.filter((n) => !isRouteNumber(n));
  return proper.length ? proper : names;
}

/** Road names on this route, most distance first, then the names in its description. */
function candidateNames(g: GoogleRoute): string[] {
  const distance = new Map<string, number>();
  for (const step of g.legs?.flatMap((l) => l.steps ?? []) ?? []) {
    const firstLine = step.navigationInstruction?.instructions?.split("\n")[0] ?? "";
    const road = firstLine.match(/\b(?:onto|on) (.+)$/)?.[1];
    for (const name of road ? roadNames(road) : []) {
      distance.set(name, (distance.get(name) ?? 0) + (step.distanceMeters ?? 0));
    }
  }
  const byDistance = [...distance].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  return [...byDistance, ...roadNames(g.description ?? "")];
}

/**
 * Google's routes as contract Routes, each named by its main road: the road it spends the most distance on,
 * or the next one when an earlier route already has that name. The id is a slug of the name, so the app can
 * match a route across samples.
 */
export function toRoutes(google: GoogleRoute[]): Route[] {
  const taken = new Set<string>();
  const ids = new Map<string, number>();
  return google.slice(0, 3).map((g, i) => {
    const candidates = candidateNames(g);
    const name = candidates.find((n) => !taken.has(n)) ?? candidates[0];
    if (name) taken.add(name);
    const base = (name && slug(name)) || `route-${i + 1}`;
    const n = (ids.get(base) ?? 0) + 1;
    ids.set(base, n);
    return {
      id: n === 1 ? base : `${base}-${n}`,
      label: name ? `via ${name}` : `Route ${i + 1}`,
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
