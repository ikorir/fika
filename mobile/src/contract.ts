// The app's copy of the Technical Contract in SPEC.md. Change the spec first, then this file.
// The backend keeps its own copy in backend/lib/contract.ts.

export type LatLng = { lat: number; lng: number };
export type Place = { placeId: string; label: string; location: LatLng };

// POST /api/routes
export type RoutesRequest = {
  origin: LatLng;
  destination: LatLng;
  arriveBy: string; // ISO
  usualDeparture: string; // ISO
};
export type Route = {
  id: string; // slug of the main road, stable across samples
  label: string; // "via Waiyaki Way"
  durationSec: number;
  staticDurationSec: number;
  distanceM: number;
  polyline: string;
  toll?: Toll; // v2: only on a route that uses a toll road
};
/** A toll road's fares, lowest to highest: the fare depends on where a car joins and leaves it. */
export type Toll = { fromKes: number; toKes: number };
export type Sample = { departAt: string /* ISO */; kind: 'now' | 'usual' | 'step'; routes: Route[] };
/** When rain is likely to start, as an ISO instant. Only there when it is forecast around the drive. */
export type Rain = { at: string };

export type RoutesResponse = { fetchedAt: string; samples: Sample[]; rain?: Rain };

// GET /api/places/autocomplete?q=…  →  PlaceSuggestions
// GET /api/places/details?placeId=… →  Place
export type PlaceSuggestion = { placeId: string; label: string };
export type PlaceSuggestions = { suggestions: PlaceSuggestion[] };

// POST /api/draft
export type DraftRequest = {
  state: 'on_time' | 'at_risk' | 'late';
  facts: {
    deadline: string; // display strings, e.g. "9:00"
    leaveBy: string | null; // null once the departure the screen is about has arrived
    onTheRoad: boolean; // the trip is already under way, so there is no leaving left to do
    eta: string; // must appear verbatim in the notice
    lateMin: number; // exact, as the screen shows it beside the ETA
    lateMinRounded: number; // rounded up for the message; 0 unless late
    usualDeparture: string; // "" once the usual departure has gone by
    usualArrival: string;
    selectedRoute: string;
    recommendedRoute: string;
    betterRoute: { label: string; arriveAt: string } | null; // the route that would restore on time, and when it arrives
    routes: { label: string; durationMin: number; trafficDelayMin: number }[];
    cause?: string; // only for a simulated accident
    rain?: { at: string };
  };
  recipient: { name: string; relationship: string };
  tone: 'manager' | 'friend';
  language: 'en' | 'sw' | 'sheng';
};
export type DraftResponse = {
  decision_line: string;
  conditions_note: string;
  notice: string;
  source: 'claude' | 'template';
};

export type ApiError = { error: string };

// Stored commute (AsyncStorage, one key), v2. A v1 value (no `version`) reads as v2 with defaults: see SPEC.md,
// "v2 amendments".
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type Contact = {
  name: string;
  phone: string; // international digits, no plus
  relationship: string;
  tone: 'manager' | 'friend';
  language: 'en' | 'sw' | 'sheng';
};
export type Commute = {
  version: 2;
  origin: Place;
  destination: Place;
  arriveBy: string; // "HH:mm", Africa/Nairobi
  usualDeparture: string; // "HH:mm", Africa/Nairobi
  bufferMin: number; // default 10
  extraMin: number; // default 5
  mode: 'drive' | 'ride_hail';
  contact: { name: string; phone: string /* international digits, no plus */; relationship: string }; // = contacts[0], for older readers
  quietWeekends: boolean; // default true
  arriveByByDay?: Partial<Record<Weekday, string>>; // "HH:mm"; a day's own arrive-by, in place of arriveBy
  returnTrip?: { homeBy: string }; // "HH:mm"
  contacts: Contact[]; // one or two; contacts[0] mirrors contact
};

// Commute engine
export type Simulation = {
  delay?: { routeId: string; addMin: number; cause: string };
  clock?: string; // ISO; replaces now
  midTrip?: { routeId: string; departedAt: string };
};
export type RouteView = {
  id: string;
  label: string;
  durationMin: number;
  trafficDelayMin: number;
  arriveAt: string;
  deltaMin: number; // negative = early
  deltaKind: 'early' | 'tight' | 'late'; // green, amber, red
  recommended: boolean;
  selected: boolean;
  polyline: string;
  toll?: Toll; // the route's own, passed through
};
export type Evaluation = {
  state: 'on_time' | 'at_risk' | 'late';
  now: string;
  departAt: string; // the departure the route list is computed for
  leaveBy: string | null;
  remindAt: string | null; // leaveBy − 10 min
  eta: string;
  lateMin: number;
  lateMinRounded: number;
  usual: { departAt: string; arriveAt: string; lateMin: number } | null;
  routes: RouteView[];
  betterRouteId: string | null; // a route that restores on time, for "Switch to …"
  noRouteOnTime: boolean;
  simulated: boolean;
  simulationLabel: string | null; // drives the banner, nothing else does
};
