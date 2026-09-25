# 04 — Map polish

**Items:** P6, P6, P6 · **Architecture:** `PLAN.md` → Motion system; Phase D · **Decisions:** D1

**Blocked by:** 01

**Status:** ready-for-agent

**Reviewer:** at coordinator discretion

Parts are built in order, each test-first where its Testing line says so. The ticket is accepted only when every part's criteria hold.

Files not listed under a part are read-only. `SPEC.md`, `PLAN.md` and other tickets are never edited by the implementer.

## Part A — Map camera motion (P6)

The map moves instead of jumping: selecting a route animates the camera to fit it, and "Switch to …" does a short pitched fly before settling.

**Files:** `mobile/src/today/MapArea.tsx`.

**Acceptance criteria**

- [ ] Route set changes still fit all routes (existing behaviour) but animated over `motion.duration.slow`.
- [ ] Selecting a route animates to fit the selected route with the existing edge padding.
- [ ] A switch triggered by the primary action (pass a `reason` or compare previous selection) animates with a 45° pitch mid-way and settles back to 0 pitch; on Android with no Maps key the fallback note still shows and nothing throws.
- [ ] With reduce motion, camera changes are instant.
- [ ] No animation loop: the camera settles and stops.

**Testing:** Unit test any pure helper (e.g. fit region for a set of points) if added. Full suite and typecheck.

**Device check (coordinator, D14):** Tap each route and the Switch action in the at-risk preset; watch the camera move and settle. Screenshot after settle.

## Part B — Map glow, fade and markers (P6)

Make the map look expensive: a soft glow under the selected route, a fade from the map into the black below, ETA bubbles with a tail, origin and destination markers with a soft ring, and a pulsing incident marker.

**Files:** `mobile/src/today/MapArea.tsx`, new `mobile/src/today/MapMarkers.tsx` if it helps, `design/DESIGN.md` (one behaviour entry).

**Acceptance criteria**

- [ ] The selected route draws a second polyline underneath: width ×3, accent at 20% opacity.
- [ ] An `expo-linear-gradient` at the bottom 48 px of the map fades from transparent to `color.bg`; it does not block map touches (`pointerEvents="none"`).
- [ ] ETA bubbles are an SVG with a small downward tail pointing at the road; text and colours unchanged.
- [ ] Origin and destination markers have a 2 px ring in `color.bg` and a soft outer ring at 30% of their colour.
- [ ] The incident marker pulses (scale and opacity ring) with Reanimated while a simulated accident is active; static with reduce motion.
- [ ] Marker `tracksViewChanges` is off once rendered so the map stays smooth.

**Testing:** Full suite and typecheck.

**Device check (coordinator, D14):** Screenshots of on time, at risk (incident visible) and late. Scroll the map; check smoothness in the at-risk state.

## Part C — Blurred header controls (P6)

The round header controls on the map float on a blurred backdrop instead of a flat fill.

**Files:** `mobile/src/today/HeaderControls.tsx`.

**Acceptance criteria**

- [ ] Each round control renders an `expo-blur` `BlurView` (dark tint, intensity ~30) clipped to the circle, under the icon; the existing border stays.
- [ ] On Android, where blur can be costly, `experimentalBlurMethod` is left off and the current flat fill is used instead.
- [ ] The Demo mode icon still turns accent when Demo mode is on; tap targets stay at least 44 px.

**Testing:** Full suite and typecheck.

**Device check (coordinator, D14):** Screenshot the header over a busy part of the map on iOS.

## Comments
