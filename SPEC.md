# Fika — commute decision assistant

> "Know when to leave, which way to go, and when to let someone know."
> Impact Lab Hackathon (Claude Community Kenya) · Everyday track · 12-hour build · 5-minute live demo

## Problem Statement

I have to be at work (or class) by a fixed time every weekday, and Nairobi traffic makes my arrival time unpredictable. Today I do this job by hand: I open Google Maps, guess how much earlier I should leave, pick a route on instinct, and when it goes wrong I find out too late and fire off a panicked WhatsApp message to my manager after I am already late.

Nothing I use today is built around my **deadline**. Maps tells me how long the trip takes now; it does not tell me the latest moment I can leave, whether my usual departure time will make me late today, or that I should warn someone *before* I am late.

## Solution

Fika is a mobile app built around one saved **commute** (origin, destination, arrival deadline, usual departure time, a contact to notify). Every morning it answers three questions on a single "Today's commute" screen:

1. **Which way should I go?** Two or three driving routes on a map and as cards, each with a traffic-aware ETA and how it compares to my deadline.
2. **When should I leave?** A leave-by time that respects my buffer, and what happens if I leave at my usual time instead.
3. **Am I going to be late anyway?** When the projected ETA passes the deadline, a ready-to-send late notice with my ETA, in a tone that fits the recipient, which I review and send through WhatsApp or SMS.

The screen has three states — **on time**, **at risk**, **late** — and moves between them as conditions change. A daily local notification before my usual departure prompts me to check. Claude writes the words (decision line, conditions note, late notice); code computes every number.

For the live demo, a clearly labelled **Demo mode** layers a simulated delay on top of real route data so the full arc can be shown in minutes, and can run fully offline from a bundled fixture.

## User Stories

### Setting up the commute
1. As a commuter, I want to set my home and work addresses by typing and picking from suggestions, so that I do not have to find coordinates or drop pins.
2. As a commuter, I want to set the time I must arrive by, so that every recommendation is measured against my real deadline.
3. As a commuter, I want to set my usual departure time, so that the app can tell me what my habit would cost me today.
4. As a commuter, I want to set a buffer (default 10 minutes), so that "on time" means comfortably on time, not to the second.
5. As a commuter, I want to set "extra minutes" (default 5) for parking or ride-hail pickup wait, so that the ETA reflects when I actually walk in.
6. As a commuter, I want to choose whether I drive or take a ride-hail, so that the extra-minutes field is labelled in a way that makes sense to me.
7. As a commuter, I want to save a contact (name, phone number, relationship) for this commute, so that a late notice is one tap away.
8. As a commuter, I want my commute saved on my phone without creating an account, so that setup takes a minute and works on Monday.
9. As a commuter, I want to edit my saved commute, so that a change of job, deadline, or manager does not force a reinstall.
10. As a commuter, I want the same flow to work for a one-off appointment by changing the destination and deadline, so that I do not need a second app.

### Which way should I go
11. As a commuter, I want to see up to three driving routes for my commute, so that I can compare options.
12. As a commuter, I want each route named by its main road ("via Waiyaki Way"), so that I recognise it without reading a map.
13. As a commuter, I want each route's ETA and its difference from my deadline ("12 min early", "8 min late"), so that I can judge it at a glance.
14. As a commuter, I want the routes drawn on a map with the selected one highlighted, so that I can see where they differ.
15. As a commuter, I want tapping a route card to highlight that route on the map (and the reverse), so that the list and the map stay in sync.
16. As a commuter, I want the map to fit all routes on screen automatically, so that I never have to pan or zoom to understand it.
17. As a commuter, I want the app to recommend one route, so that I do not have to do the comparison myself when I am in a hurry.
18. As a commuter, I want an "Open in Google Maps" action for the chosen route, so that I get turn-by-turn navigation from a tool I already trust.
19. As a commuter, I want to know when only one route exists, so that I am not confused by a missing comparison.

### When should I leave
20. As a commuter, I want a leave-by time for today, so that I know the latest moment I can leave and still arrive inside my buffer.
21. As a commuter, I want to see what time I would arrive if I left at my usual time, so that I know whether my habit is safe today.
22. As a commuter, I want a plain-language decision line ("Leave by 8:05 via Waiyaki Way. Your usual 8:20 gets you there at 9:15."), so that I get the answer without reading numbers off cards.
23. As a commuter, I want a conditions note that says which route is slower than normal and by how much, so that I understand why today is different.
24. As a commuter, I want a daily notification before my usual departure, so that I remember to check without forming a new habit.
25. As a commuter, I want tapping the notification to open the app with fresh data, so that I never act on stale numbers.
26. As a commuter, I want the app to refresh whenever I bring it to the foreground, so that the screen is always current.
27. As a commuter, I want to see when the data was last updated, so that I know how far to trust it.
28. As a commuter, I want to be told when it is already past my leave-by time, so that I know to leave now or switch routes.

### At risk
29. As a commuter, I want the screen to change clearly when my ETA falls inside my buffer, so that I notice the risk without reading.
30. As a commuter, I want the at-risk state to tell me what to do ("leave now, or switch to Route B"), so that I can still recover.
31. As a commuter, I want to see whether another route would put me back on time, so that switching is an informed choice.

### Late
32. As a commuter, I want the screen to tell me plainly when my projected ETA is past my deadline, so that I stop hoping and start communicating.
33. As a commuter, I want a late notice drafted for me with my ETA and how late I will be, so that I can warn someone before I am actually late.
34. As a commuter, I want lateness in the message rounded up to the nearest 5 minutes, so that I do not promise a precision I cannot keep.
35. As a commuter, I want to switch the notice's tone (manager, friend) and language (English, Swahili, Sheng), so that it sounds like me and fits the recipient.
36. As a commuter, I want to edit the draft before sending, so that the final words are mine.
37. As a commuter, I want to send the notice through WhatsApp with the message prefilled to my saved contact, so that sending takes two taps.
38. As a commuter, I want an SMS fallback, so that I can still send when the recipient is not on WhatsApp or WhatsApp is not installed.
39. As a commuter, I want a share-sheet option, so that I can post the notice to a group chat.
40. As a commuter, I want the app to never send anything on its own, so that I stay in control of what goes out under my name.
41. As a commuter, I want the ETA in the notice to always match the ETA on screen, so that the message is never wrong.
42. As a commuter, I want a usable notice even if the AI service is down, so that the feature I need most under stress does not fail.

### Failure and trust
43. As a commuter, I want a clear message when routes cannot be fetched, with the last known result still visible, so that I am not left with a blank screen.
44. As a commuter, I want to be told when no route can get me there on time, so that I move straight to sending a notice.

### Demo
45. As a presenter, I want a Demo mode toggle, so that I can show a delay without waiting for real traffic.
46. As a presenter, I want preset scenarios ("Accident on Route A, +25 min", "Advance clock to mid-trip"), so that the demo arc is repeatable under a hard clock.
47. As a presenter, I want a persistent "SIMULATED TRAFFIC" banner whenever any simulation is active, so that judges are never misled about what is real.
48. As a presenter, I want simulated delays applied on top of the real route response, so that the base numbers are genuine.
49. As a presenter, I want Demo mode to run from a bundled saved response with pre-generated wording, so that the demo survives venue wifi, Google, or Claude failing.
50. As a presenter, I want to control the app's clock in Demo mode, so that I can trigger the reminder and the mid-trip state on cue.
51. As a presenter, I want to reset Demo mode to the starting state in one tap, so that rehearsals and a restart on stage are fast.
52. As a judge, I want to see the app working on the presenter's real commute with live data, so that "would you use this on Monday?" has a literal answer.

## Implementation Decisions

### Shape
- Two deployables: an **Expo app** (run in Expo Go) and a **Next.js backend** on the team's Coolify server (Docker image built from the repository). No database, no accounts, no auth. The backend exists to keep the Google and Anthropic keys off the device.
- The backend is a **thin proxy**. All commute decisions live in one pure module in the app, the **commute engine**. This keeps decision logic in one place and lets Demo mode run offline.
- Backend is deployed in the first hour; the app always talks to the deployed URL, never to a laptop on venue wifi.

### Commute engine (pure, no I/O, clock injected)
Inputs: the commute settings, a set of route samples, the current time, and an optional simulation. Outputs: everything the screen renders.
- **Arrival time** = departure time + route duration + extra minutes.
- **Leave-by** = the latest sampled departure whose best-route arrival is at or before deadline − buffer. If none qualifies, leave-by is "none" and the result says no route makes it.
- **Usual-time projection** = arrival of the best route for the sample nearest the usual departure time.
- **State**, from the projected ETA of the selected route: *on time* when ETA ≤ deadline − buffer; *at risk* when deadline − buffer < ETA ≤ deadline; *late* when ETA > deadline. Before departure the projection assumes leaving now (or at leave-by if that is still in the future); in Demo mode's mid-trip preset it assumes the remaining trip from the advanced clock.
- **Recommended route** = earliest arrival for the chosen departure; ties go to the route with the smaller traffic delay.
- **Traffic delay per route** = duration − static (no-traffic) duration.
- **Lateness for messaging** = minutes past deadline rounded **up** to the nearest 5.
- **Simulation overlay** = adds a delay to a named route and/or advances the clock; applied to samples before any other calculation. The engine reports whether any simulation is active; the banner is driven only by that flag.

### Backend contract
- **Routes endpoint** — input: origin, destination, deadline, usual departure time. It queries Google Routes (`DRIVE`, `TRAFFIC_AWARE_OPTIMAL`, alternatives on) for about 6 departure times in parallel, stepping back from the deadline in 10–15 minute increments and including "now" and the usual departure time. Driving has no arrive-by in the Routes API, hence the search. Output: a list of samples, each with its departure time and up to 3 routes (label from the route's main road, duration, static duration, distance, encoded polyline). No decision logic. Responses cached per commute for a few minutes.
- **Draft endpoint** — input: facts already computed by the engine (state, deadline, leave-by, ETA as display strings, rounded lateness, per-route traffic delays, recipient name and relationship, tone, language, optional rain flag). One Claude call (Haiku 4.5) returning JSON with `decision_line`, `conditions_note`, `notice`. Claude is told never to compute or alter numbers.
- **Draft guard** — the response is schema-validated, and the notice must contain the exact ETA string that was passed in. On any failure (timeout, invalid JSON, missing ETA) the endpoint returns a deterministic template in the requested language. The app has the same English template for offline use. This is what makes story 41 and 42 true.
- **Places proxy** — autocomplete and place details, passthrough, restricted to Kenya.

### App
- One "Today's commute" screen: map on the top third (react-native-maps, route polylines, selected route highlighted, fit-to-routes, synced with cards; no live location dot, no on-map search), then the decision line and conditions note, route cards, and a state-dependent action area (remind me / leave now or switch / review and send notice).
- A setup screen for the commute, stored in AsyncStorage. Seeded with the presenter's real commute so the demo never types an address.
- Refresh on foreground and on notification tap. No background polling. One repeating daily local notification scheduled a fixed lead time before the usual departure.
- Sending: WhatsApp `wa.me/<number>?text=` link to the saved contact first, `sms:` fallback, system share sheet for groups. The app only ever opens a prefilled composer.
- Navigation handoff: "Open in Google Maps" deep link for the selected route.
- Demo mode: toggle, the two presets, clock control, reset, and the persistent banner. Offline fixture = one saved real routes response plus pre-generated draft outputs for each preset/tone shown in the script.

### Order of work and cut list
- Pre-work (allowed): scaffold both projects, deploy the empty backend, prove one real Routes request for a Nairobi commute (confirm alternatives carry traffic-aware durations for future departure times), and prove the WhatsApp link on a real phone.
- Four workstreams: (1) screen and states on top of the engine; (2) routes endpoint and map; (3) draft endpoint, notice UI, sending; (4) Demo mode, offline fixture, pitch and timed rehearsals from hour 9. Feature freeze at hour 10.
- Map has a 3-hour limit; fall back to cards only if it is not working by then.
- Cut order, first to go first: rain note → tone and language variants → map polylines → Places Autocomplete (replace with the seeded commute plus a short preset list). The three states and the late notice are never cut.

## Design

The look of the app is fixed by the "Fika app design" canvas (https://claude.ai/artifact/ACWoARzcKHbdC6Zz7UAY15, private to its owner). The repository holds a snapshot and a summary: `design/DESIGN.md` (tokens, screen list, behaviour) and `design/screens/` (six 390 × 844 HTML mock-ups: Today on time, Today at risk, Today late, Late notice sheet, Commute setup, Demo mode sheet). The mock-ups are reference only; the app is built with React Native views and styles. Dark theme only, Figtree, accent `#F28C38`, state colours green `#4CC38A`, amber `#F2C94C`, red `#FF6B5E`.

Behaviour the design adds to this spec:

- One primary action per state: "Remind me at <leave-by − 10 min>" (on time; a one-off local notification for today, separate from the daily one), "Switch to <best route>" (at risk), "Review and send notice" (late).
- Header controls over the map: edit commute, Demo mode, manual refresh.
- Route difference colour: green outside the buffer, amber inside it, red past the deadline.
- The map shows an ETA bubble per route and an incident marker on the delayed route during a simulated accident.
- The simulated-traffic banner names what is simulated ("WAIYAKI WAY +25 MIN", "CLOCK SET TO 8:40").
- The late state previews the notice on the main screen; the editor is a bottom sheet. ETA and lateness show as locked chips labelled "from your route, not AI".
- Demo mode sheet has an app clock with 5-minute steps and a "Use saved routes" switch for the offline fixture.
- Claude may mention a cause (such as an accident) only when one is passed in as a fact, which happens only for the simulated accident. With live data it never invents a cause.

## Technical Contract

Tickets 02, 07 and 08 run in parallel, and so do 03, 04 and 09, so the shapes below are fixed up front. Change this section first, then the code. The type shapes are inlined because prose cannot state them precisely; names of files and folders are left to ticket 01 and its handoff notes.

### Stack

- One repository, two projects side by side: the Expo app and the Next.js backend. No workspace tooling. Each side keeps its own copy of the contract types; the backend validates what it returns with zod.
- App: latest Expo SDK with Expo Router and TypeScript, run in Expo Go. `react-native-maps`, `expo-notifications`, AsyncStorage, `Linking` and the share API from React Native, `@mapbox/polyline` to decode route lines, `@expo-google-fonts/figtree`. Tests: `jest-expo`.
- Backend: Next.js App Router route handlers deployed on Coolify, TypeScript, zod, the official Anthropic SDK. Tests: vitest. Secrets only in the Coolify application's environment variables: `GOOGLE_MAPS_API_KEY`, `ANTHROPIC_API_KEY`.
- The app reads the backend URL from one public environment variable.
- Time: every instant on the wire is ISO 8601 with offset. The commute's times of day are `"HH:mm"` in Africa/Nairobi. Only the app formats times for display, and those display strings are what it sends to the draft endpoint.

### Google calls (backend only)

- Routes: `POST https://routes.googleapis.com/directions/v2:computeRoutes`, `travelMode: DRIVE`, `routingPreference: TRAFFIC_AWARE_OPTIMAL`, `computeAlternativeRoutes: true`, `departureTime` set for future samples and omitted for "now". Field mask: `routes.duration, routes.staticDuration, routes.distanceMeters, routes.description, routes.polyline.encodedPolyline, routes.legs.steps.distanceMeters, routes.legs.steps.navigationInstruction.instructions`. Durations arrive as strings such as `"2700s"`.
- Places (New): autocomplete with `includedRegionCodes: ["ke"]`; place details for `location`, `displayName`, `formattedAddress`.
- A route is named by its main road: the road its steps spend the most distance on, with abbreviations expanded ("Waiyaki Wy/A104" → "Waiyaki Way"). When an earlier route in the same response already has that name, it takes its next-longest road. It falls back to the names in `description`, which alone is not enough: Google fills it with road numbers ("A104") and it varies between calls for the same route.
- Routes differ between samples. A route's `id` is a slug of its main road ("via Waiyaki Way" → `waiyaki-way`), and that is how the app matches a route across samples.

### Backend endpoints

```ts
type LatLng = { lat: number; lng: number };
type Place = { placeId: string; label: string; location: LatLng };

// POST /api/routes
type RoutesRequest = { origin: LatLng; destination: LatLng; arriveBy: string /* ISO */; usualDeparture: string /* ISO */ };
type Route = { id: string; label: string; durationSec: number; staticDurationSec: number; distanceM: number; polyline: string };
type Sample = { departAt: string /* ISO */; kind: "now" | "usual" | "step"; routes: Route[] };
type RoutesResponse = { fetchedAt: string; samples: Sample[] };   // about 6 samples, up to 3 routes each

// GET /api/places/autocomplete?q=…  →  { suggestions: { placeId: string; label: string }[] }
// GET /api/places/details?placeId=… →  Place

// POST /api/draft
type DraftRequest = {
  state: "on_time" | "at_risk" | "late";
  facts: {
    deadline: string;            // display strings, e.g. "9:00"
    leaveBy: string | null;
    eta: string;                 // must appear verbatim in the notice
    lateMinRounded: number;      // 0 unless late
    usualDeparture: string; usualArrival: string;
    selectedRoute: string; recommendedRoute: string;
    routes: { label: string; durationMin: number; trafficDelayMin: number }[];
    cause?: string;              // only for a simulated accident
    rain?: { at: string };       // ticket 11
  };
  recipient: { name: string; relationship: string };
  tone: "manager" | "friend";
  language: "en" | "sw" | "sheng";
};
type DraftResponse = { decision_line: string; conditions_note: string; notice: string; source: "claude" | "template" };
```

Errors are `{ error: string }` with a 4xx or 5xx status. The draft endpoint never errors for a Claude failure; it answers with `source: "template"`. Model: `claude-haiku-4-5-20251001`, short timeout (about 6 seconds).

### Stored commute (AsyncStorage, one key)

```ts
type Commute = {
  origin: Place; destination: Place;
  arriveBy: string; usualDeparture: string;     // "HH:mm"
  bufferMin: number;                            // default 10
  extraMin: number;                             // default 5
  mode: "drive" | "ride_hail";
  contact: { name: string; phone: string /* international digits, no plus */; relationship: string };
};
```

### Commute engine (pure, in the app)

```ts
type Simulation = {
  delay?: { routeId: string; addMin: number; cause: string };   // "Accident on Waiyaki Way"
  clock?: string;                                                // ISO; replaces now
  midTrip?: { routeId: string; departedAt: string };             // remaining trip projected from the clock
};
type RouteView = {
  id: string; label: string; durationMin: number; trafficDelayMin: number;
  arriveAt: string; deltaMin: number;           // negative = early
  deltaKind: "early" | "tight" | "late";        // green, amber, red
  recommended: boolean; selected: boolean; polyline: string;
};
type Evaluation = {
  state: "on_time" | "at_risk" | "late";
  now: string; departAt: string;                // the departure the route list is computed for
  leaveBy: string | null; remindAt: string | null;   // remindAt = leaveBy − 10 min
  eta: string; lateMin: number; lateMinRounded: number;
  usual: { departAt: string; arriveAt: string; lateMin: number } | null;
  routes: RouteView[];
  betterRouteId: string | null;                 // a route that restores on time, for "Switch to …"
  noRouteOnTime: boolean;
  simulated: boolean; simulationLabel: string | null;   // drives the banner, nothing else does
};
function evaluate(input: { commute: Commute; samples: Sample[]; now: Date; selectedRouteId?: string; simulation?: Simulation }): Evaluation;
```

The screen renders an `Evaluation` and nothing else; it holds no commute logic of its own.

## Testing Decisions

- A good test here feeds inputs through a public interface and asserts on what the user would see (leave-by time, state, recommended route, message text). No tests of internal helpers, component structure, or prompt wording.
- **Primary seam: the commute engine.** It is pure with an injected clock, so tests are table-driven: samples + settings + now (+ simulation) → expected output. Cover: leave-by picks the latest qualifying sample; no qualifying sample; buffer and extra minutes shift the result; each state boundary (exactly at deadline − buffer, exactly at deadline); recommended-route tie-break; lateness rounding (1 → 5, 5 → 5, 16 → 20); simulation overlay moves on time → at risk → late using the demo presets; simulation flag is set whenever any overlay is active. The bundled demo fixture is itself a test case, so the stage arc is verified by the suite.
- **Secondary seam: the draft endpoint**, with the Anthropic client faked. Cover: a valid response passes through; invalid JSON, a timeout, and a notice missing the ETA string each return the template containing the exact ETA and rounded lateness.
- Not automated: the routes endpoint (thin proxy; one recorded real response is kept as the fixture and checked by hand), the map, notifications, and deep links. These are checked by the timed rehearsals on a simulator and a real phone.
- No prior art: the repository is empty. Use the test runner that ships with the Expo template for the engine and the Next.js project's default for the endpoint.

## Out of Scope

- Matatu, bus, walking, or cycling; any mode other than driving and ride-hail.
- Turn-by-turn navigation, live GPS tracking, background location, background polling.
- Automatic sending of any message; direct posting into WhatsApp groups.
- Accounts, sync across devices, server-side storage, multiple saved commutes.
- Push (remote) notifications; development or store builds (Expo Go only).
- Calendar integration, learning from past trips, variability-based buffers.
- Cities outside Kenya (nothing prevents them; they are not tested).
- Ride-hail price or booking integration.

## Further Notes

- Track rules: say "Everyday" at the start, name the recurring job and who does it today, five minutes on a hard clock, live software only. Judges ask: "Would you use this on Monday?"
- Demo script: 0:00–0:30 track, job, and how it is done today · 0:30–1:45 real commute live: routes on the map, leave-by, the usual-time line · 1:45–2:45 reminder fires, tap it, accident preset, at risk, "switch to Route B" · 2:45–4:00 advance clock to mid-trip, late, notice drafted, flip manager → friend in Sheng, WhatsApp opens prefilled · 4:00–4:40 "Monday: my real commute, real data" on the phone · 20 seconds spare. Stage: simulator projected, phone on Expo Go as backup, recorded clean run as last resort.
- Verified facts: Routes API ignores `arrivalTime` for driving; up to 3 alternatives, not guaranteed; traffic-aware requests bill at the Pro tier (5,000 free calls a month, about 800 checks at 6 calls each; billing account with a card required); Google rates Kenya traffic and driving directions as good quality; local scheduled notifications and react-native-maps work in Expo Go.
- Unverified, test early: that alternative routes carry traffic-aware durations for future departure times; WhatsApp link behaviour (`wa.me/<number>?text=` prefill, no group targeting) on a real phone; Haiku's Sheng quality — move to a larger model if it reads badly.
- The team holds both the Google and Anthropic keys. The event date is not recorded here.
