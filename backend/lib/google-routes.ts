// Google Routes API (computeRoutes), driving with traffic. No decision logic here.
import type { LatLng, Route } from "@/lib/contract";
import { tollFor } from "@/lib/tolls";

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
    .map((n) =>
      n
        .trim()
        .replace(/\s*-\s*/g, "-")
        .replace(/[A-Za-z]+$/, (w) => ABBREVIATIONS[w] ?? w),
    )
    .filter((n) => /^[A-Z0-9]/.test(n));
  const proper = names.filter((n) => !isRouteNumber(n));
  return proper.length ? proper : names;
}

type Roads = {
  distance: Map<string, number>; // metres on each road name
  described: string[]; // names in the route description, the fallback
  aliases: Map<string, Set<string>>; // each name to the names sharing a step with it, itself included
  durationSec: number;
};

/** A step can give one stretch several names ("Kisumu-Nairobi Rd/Waiyaki Wy"); those are aliases of one road. */
function roadsOf(googleRoute: GoogleRoute): Roads {
  const distance = new Map<string, number>();
  const aliases = new Map<string, Set<string>>();
  const addAliases = (names: string[]) => {
    for (const name of names) aliases.set(name, new Set([...(aliases.get(name) ?? []), ...names]));
  };
  for (const step of googleRoute.legs?.flatMap((l) => l.steps ?? []) ?? []) {
    const firstLine = step.navigationInstruction?.instructions?.split("\n")[0] ?? "";
    const road = firstLine.match(/\b(?:onto|on) (.+?)(?: towards? .*)?$/)?.[1];
    const names = road ? roadNames(road) : [];
    addAliases(names);
    for (const name of names) distance.set(name, (distance.get(name) ?? 0) + (step.distanceMeters ?? 0));
  }
  const described = roadNames(googleRoute.description ?? "");
  addAliases(described);
  return { distance, described, aliases, durationSec: seconds(googleRoute.duration) };
}

/**
 * One name per route: its main road, or its next-longest other road when another route has that name.
 * A tie between names of one stretch goes to the name that runs furthest across all the routes.
 * Routes with the most distance on their main road choose first (the faster on a tie), so Google's order does
 * not change the names.
 */
function pickNames(roads: Roads[]): (string | undefined)[] {
  const overall = new Map<string, number>();
  for (const { distance } of roads) for (const [name, m] of distance) overall.set(name, (overall.get(name) ?? 0) + m);
  const ranked = roads.map(({ distance, described }) => {
    const byDistance = [...distance.keys()].sort(
      (a, b) => distance.get(b)! - distance.get(a)! || overall.get(b)! - overall.get(a)!,
    );
    const names = [...byDistance, ...described];
    return { names, mainDistance: distance.get(names[0]) ?? 0 };
  });
  const byClaim = ranked
    .map((_, i) => i)
    .sort(
      (a, b) =>
        ranked[b].mainDistance - ranked[a].mainDistance ||
        roads[a].durationSec - roads[b].durationSec ||
        ranked[a].names.join("|").localeCompare(ranked[b].names.join("|")),
    );
  const taken = new Set<string>();
  const picked: (string | undefined)[] = [];
  for (const i of byClaim) {
    const { aliases } = roads[i];
    const sameRoad = (name: string) => aliases.get(name) ?? new Set([name]);
    const names = ranked[i].names;
    const name = names.find((n) => ![...sameRoad(n)].some((a) => taken.has(a))) ?? names[0];
    if (name) sameRoad(name).forEach((a) => taken.add(a));
    picked[i] = name;
  }
  return picked;
}

/**
 * Google's routes as contract Routes, named by main road. The id is a slug of the name, so the app can match a route
 * across samples. A route named for a toll road carries its toll range; any other has no `toll` at all.
 */
export function toRoutes(google: GoogleRoute[]): Route[] {
  const googleRoutes = google.slice(0, 3);
  const names = pickNames(googleRoutes.map(roadsOf));
  const seen = new Map<string, number>();
  return googleRoutes.map((googleRoute, i) => {
    const name = names[i];
    const base = (name && slug(name)) || `route-${i + 1}`;
    const occurrence = (seen.get(base) ?? 0) + 1;
    seen.set(base, occurrence);
    const label = name ? `via ${name}` : `Route ${i + 1}`;
    const toll = tollFor(label);
    return {
      id: occurrence === 1 ? base : `${base}-${occurrence}`,
      label,
      durationSec: seconds(googleRoute.duration),
      staticDurationSec: seconds(googleRoute.staticDuration),
      distanceM: googleRoute.distanceMeters ?? 0,
      polyline: googleRoute.polyline?.encodedPolyline ?? "",
      ...(toll && { toll }),
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
  if (!res.ok) throw new Error(`Google Routes ${res.status}: ${json?.error?.message ?? res.statusText}`);
  return toRoutes(json?.routes ?? []);
}
