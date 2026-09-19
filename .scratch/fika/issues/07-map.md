# 07 — Map

**What to build:** The routes are drawn on a map on the top third of the screen so the commuter can see where they differ. The selected route is highlighted, the view fits all routes automatically, and the map and the route cards stay in sync both ways. "Open in Google Maps" hands off navigation. No live location dot, no turn-by-turn, no search on the map. Three-hour limit: if it is not working by then, ship cards only.

**Blocked by:** 01 — Walking skeleton

**Status:** ready-for-agent

- [ ] Up to 3 route lines drawn from the encoded polylines, with origin and destination markers
- [ ] Selected route is visually distinct; the recommended route is selected by default
- [ ] Tapping a card selects its route on the map, and tapping a route line selects its card
- [ ] The view fits all routes with padding whenever routes change; no panning or zooming needed
- [ ] "Open in Google Maps" opens directions for the commute
- [ ] Works in Expo Go on iOS and Android
- [ ] A single route is shown without a broken comparison
- [ ] Dark map style close to the design; selected route in accent orange, others grey, dimmer still in the late state
- [ ] An ETA bubble sits on each route line
- [ ] An incident marker shows on the delayed route while a simulated accident is active (amber when at risk, red when late)

**Technical notes:** `react-native-maps` with polylines decoded by `@mapbox/polyline` from `RouteView.polyline`; `fitToCoordinates` on change; custom dark map style JSON on Android (iOS in Expo Go uses Apple Maps: use its dark appearance). Google Maps hand-off: `https://www.google.com/maps/dir/?api=1&origin=…&destination=…&travelmode=driving`. Shapes and stack: see "Technical Contract" in the spec.

**Design:** Map area of all three Today screens, with the header controls floating over it (edit commute; Demo mode and refresh). Follow `design/DESIGN.md` (tokens, screen list, behaviour) and the mock-ups in `design/screens/`; live canvas: https://claude.ai/artifact/ACWoARzcKHbdC6Zz7UAY15. The mock-ups are HTML for reference only: build with React Native views and styles.

**Testing:** No TDD: map rendering is not worth automating in 12 hours. One unit test is worth it: the Google Maps hand-off URL builder. Everything else is checked by hand on iOS and Android.

**Commits:** Land this ticket as 2 to 5 small commits on the current branch, not one big one. Each commit is one coherent step, leaves the tests passing, and keeps a test together with the code that makes it pass. Imperative subject line ending with `(refs #9)`. Do not use "closes" or "fixes" in a commit message: the ticket is closed by hand after the handoff notes are posted. Fixes from the code review go in their own commit. Suggested split: map with route lines and markers · selection sync with the route cards and fit-to-routes · ETA bubbles, incident marker and dark style · Google Maps hand-off link with its test.

**Review:** Once the acceptance criteria are met and the tests pass, run `/code-review` on this ticket's changes, before writing the handoff notes. Fix every confirmed finding and re-run the tests. Anything you decide not to fix goes in the handoff notes with the reason. Keep the review to this ticket's changes; do not refactor other tickets' work.

**Handoff notes:**

- Before starting: read the spec and the "Handoff notes" comment on every ticket listed under "Blocked by". Trust those notes over the spec where they differ; they describe what was actually built.
- When done, before closing: post one comment titled "Handoff notes" on this ticket with:
  - What was built, in a few lines, and how to run and test it
  - Decisions made and anything that deviates from the spec or this ticket, with the reason
  - Names of the interfaces the next tickets will touch (endpoints, engine inputs and outputs, stored settings), as they actually are
  - Gotchas, known gaps, and anything left unfinished
  - What each ticket blocked by this one should know before it starts
