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
};
export type Sample = { departAt: string /* ISO */; kind: 'now' | 'usual' | 'step'; routes: Route[] };
export type RoutesResponse = { fetchedAt: string; samples: Sample[] };

// GET /api/places/autocomplete?q=…  →  PlaceSuggestions
// GET /api/places/details?placeId=… →  Place
export type PlaceSuggestions = { suggestions: { placeId: string; label: string }[] };

// POST /api/draft
export type DraftRequest = {
  state: 'on_time' | 'at_risk' | 'late';
  facts: {
    deadline: string; // display strings, e.g. "9:00"
    leaveBy: string | null;
    eta: string; // must appear verbatim in the notice
    lateMinRounded: number; // 0 unless late
    usualDeparture: string;
    usualArrival: string;
    selectedRoute: string;
    recommendedRoute: string;
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

// Stored commute (AsyncStorage, one key)
export type Commute = {
  origin: Place;
  destination: Place;
  arriveBy: string; // "HH:mm", Africa/Nairobi
  usualDeparture: string; // "HH:mm", Africa/Nairobi
  bufferMin: number; // default 10
  extraMin: number; // default 5
  mode: 'drive' | 'ride_hail';
  contact: { name: string; phone: string /* international digits, no plus */; relationship: string };
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
