// The backend's copy of the Technical Contract in SPEC.md. Change the spec first, then this file.
// The app keeps its own copy in mobile/src/contract.ts.
import { z } from "zod";

const isoInstant = z.iso.datetime({ offset: true });

export const LatLng = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
export type LatLng = z.infer<typeof LatLng>;

// POST /api/routes
export const RoutesRequest = z.object({
  origin: LatLng,
  destination: LatLng,
  arriveBy: isoInstant,
  usualDeparture: isoInstant,
});
export type RoutesRequest = z.infer<typeof RoutesRequest>;

export const Route = z.object({
  id: z.string().min(1), // slug of the main road, stable across samples
  label: z.string().min(1), // "via Waiyaki Way"
  durationSec: z.number().int().nonnegative(),
  staticDurationSec: z.number().int().nonnegative(),
  distanceM: z.number().int().nonnegative(),
  polyline: z.string(),
});
export type Route = z.infer<typeof Route>;

export const Sample = z.object({
  departAt: isoInstant,
  kind: z.enum(["now", "usual", "step"]),
  routes: z.array(Route).max(3),
});
export type Sample = z.infer<typeof Sample>;

export const RoutesResponse = z.object({ fetchedAt: isoInstant, samples: z.array(Sample) });
export type RoutesResponse = z.infer<typeof RoutesResponse>;

export type ApiError = { error: string };
