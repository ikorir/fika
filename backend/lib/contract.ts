// The backend's copy of the Technical Contract in SPEC.md. Change the spec first, then this file.
// The app keeps its own copy in mobile/src/contract.ts.
import { z } from "zod";

const isoInstant = z.iso.datetime({ offset: true });

export const LatLng = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
export type LatLng = z.infer<typeof LatLng>;

export const Place = z.object({ placeId: z.string().min(1), label: z.string().min(1), location: LatLng });
export type Place = z.infer<typeof Place>;

// GET /api/places/autocomplete?q=… → PlaceSuggestions;  GET /api/places/details?placeId=… → Place
export const PlaceSuggestion = z.object({ placeId: z.string().min(1), label: z.string().min(1) });
export type PlaceSuggestion = z.infer<typeof PlaceSuggestion>;

export const PlaceSuggestions = z.object({ suggestions: z.array(PlaceSuggestion) });
export type PlaceSuggestions = z.infer<typeof PlaceSuggestions>;

// POST /api/routes
export const RoutesRequest = z.object({
  origin: LatLng,
  destination: LatLng,
  arriveBy: isoInstant,
  usualDeparture: isoInstant,
});
export type RoutesRequest = z.infer<typeof RoutesRequest>;

// v2: the range of fares on a toll road, lowest to highest; the fare depends on entry and exit.
export const Toll = z.object({ fromKes: z.number().int().nonnegative(), toKes: z.number().int().nonnegative() });
export type Toll = z.infer<typeof Toll>;

export const Route = z.object({
  id: z.string().min(1), // slug of the main road, stable across samples
  label: z.string().min(1), // "via Waiyaki Way"
  durationSec: z.number().int().nonnegative(),
  staticDurationSec: z.number().int().nonnegative(),
  distanceM: z.number().int().nonnegative(),
  polyline: z.string(),
  toll: Toll.optional(), // v2: only on a route that uses a toll road
});
export type Route = z.infer<typeof Route>;

export const Sample = z.object({
  departAt: isoInstant,
  kind: z.enum(["now", "usual", "step"]),
  routes: z.array(Route).max(3),
});
export type Sample = z.infer<typeof Sample>;

export const RoutesResponse = z.object({
  fetchedAt: isoInstant,
  samples: z.array(Sample),
  rain: z.object({ at: isoInstant }).optional(), // only when rain is likely around the drive: when it starts
});
export type RoutesResponse = z.infer<typeof RoutesResponse>;

export type ApiError = { error: string };

// POST /api/draft
export const DraftRequest = z.object({
  state: z.enum(["on_time", "at_risk", "late"]),
  facts: z.object({
    deadline: z.string(), // display strings, e.g. "9:00"
    leaveBy: z.string().nullable(), // null once the departure the screen is about has arrived
    onTheRoad: z.boolean(), // the trip is already under way, so there is no leaving left to do
    eta: z.string().min(1), // must appear verbatim in the notice
    lateMin: z.number().int().nonnegative(), // exact, as the screen shows it beside the ETA
    lateMinRounded: z.number().int().nonnegative(), // rounded up for the message; 0 unless late
    usualDeparture: z.string(), // "" when the usual departure has gone by
    usualArrival: z.string(),
    selectedRoute: z.string(),
    recommendedRoute: z.string(),
    // The route that would restore on time, and when it gets there. Only the engine decides there is one.
    betterRoute: z.object({ label: z.string(), arriveAt: z.string() }).nullable(),
    routes: z.array(
      z.object({
        label: z.string(),
        durationMin: z.number().int().nonnegative(),
        trafficDelayMin: z.number().int().nonnegative(),
      }),
    ),
    cause: z.string().optional(), // only for a simulated accident
    rain: z.object({ at: z.string().min(1) }).optional(), // only when rain is forecast around the drive: when it starts
  }),
  recipient: z.object({ name: z.string(), relationship: z.string() }),
  tone: z.enum(["manager", "friend"]),
  language: z.enum(["en", "sw", "sheng"]),
});
export type DraftRequest = z.infer<typeof DraftRequest>;

/** The three pieces of writing. What Claude must answer with, and what the template produces. */
export const DraftWords = z.object({
  decision_line: z.string().min(1),
  conditions_note: z.string().min(1),
  notice: z.string().min(1),
});
export type DraftWords = z.infer<typeof DraftWords>;

export const DraftResponse = DraftWords.extend({ source: z.enum(["claude", "template"]) });
export type DraftResponse = z.infer<typeof DraftResponse>;
