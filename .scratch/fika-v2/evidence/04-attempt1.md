# Ticket 04, attempt 1: map polish

Result: parts A, B and C are built, and every acceptance criterion has a Jest test. Nothing is committed.

## Checks (2026-09-25)

| Check | Result |
| --- | --- |
| `npm test` in `mobile/` | 38 suites, 375 of 375 pass. Before: 34 suites and 331 tests, so 44 are new. |
| `npm run typecheck` | clean (exit 0) |
| React Compiler (babel script in the scratchpad, `babel-plugin-react-compiler`) | MapArea, useCamera, useRedrawing, MapFade, Pin, OriginPin, DestinationPin, EtaBubble, IncidentMarker, HeaderControls, Backdrop and Icon all compile. `useLines` is skipped because of its `eslint-disable` line, which was already there. |
| `npx expo export --platform ios` into the scratchpad | bundles, 4.3 MB hbc |
| D3 grep (`Pressable` from `react-native`) | `ui/Press.tsx` only |
| `Animated` from `react-native` grep | empty |

## Files
- New: `mobile/src/today/camera.ts` (pure: `fitRegion`, `cameraMove`, `cameraSteps`, `moveEnd`) with `camera.test.ts` (16
  tests). `mobile/src/today/marks.ts` (pure: `withAlpha`, `bubblePath`) with `marks.test.ts` (5 tests).
  `mobile/src/today/MapMarkers.tsx` (OriginPin, DestinationPin, EtaBubble, IncidentMarker). `MapArea.test.tsx` (17
  tests) and `HeaderControls.test.tsx` (6 tests).
- Changed: `mobile/src/today/MapArea.tsx` and `mobile/src/today/HeaderControls.tsx`. `mobile/jest.setup.js` gains the
  maps mock only. `design/DESIGN.md` gains one behaviour bullet.

## How it works
### A: camera
- `fitRegion` does the edge-padding fit in JS, in Web Mercator, with the existing padding (30/12/20/12). The result
  goes through `animateToRegion(region, 400)`. `fitToCoordinates` could not take a duration.
- `cameraMove(before, now)` works by comparing to the previous selection. A new route set or a new map size fits
  every route. A new selection fits the selected route. A selection that leaves an `at_risk` or `late` state for
  `on_time` is a switch. This covers the "Switch to …" action, and also tapping that route's row or line.
- A switch plays `animateCamera({center, pitch: 45, heading: 0}, 400)`, then at 400 ms
  `animateToRegion(fit, 400)`. Both SDKs draw a region flat. `pitchEnabled` is true only during the flight, because
  Apple Maps ignores camera pitch while it is off. It turns off at 1050 ms. After that nothing runs.
- With reduce motion, every move is one `animateToRegion(region, 0)`, which is instant on both platforms, and there
  is no pitch.
- On Android with no key, the fallback returns before any map exists, and the camera calls do nothing. This is
  tested with `Platform.OS` set to android. The availability check now runs at render time rather than when the
  module loads, so a test can set the platform.

### B: look
- The glow is a second polyline right before the selected one: width 15, `rgba(242,140,56,0.2)`, zIndex 2, with the
  selected line at 3.
- `MapFade` is now an `expo-linear-gradient` with `pointerEvents="none"`, 48 pt tall, running from `rgba(0,0,0,0)`
  to `color.bg`.
- The ETA bubble is one SVG `Path` (a rounded box with a 10×5 tail), drawn to the label's measured size with the old
  fills. The text and its 1.2 cap are unchanged. The anchor is `{0.5, 1}`, so the tail tip sits on the road.
- The pins have a 2 pt `color.bg` ring, then a 4 pt halo at 30% of their colour (white for the origin, accent for
  the destination).
- The incident has a Reanimated ring that repeats (scale 1 to 1.8, opacity 0.45 to 0, 1.2 s) and only while it is
  mounted. With reduce motion it holds at half-out. The box is now 54 pt, and the anchor is recomputed so the disc
  sits where it did before.
- Every marker uses `tracksViewChanges={redrawing}`, which is off 1 s after a change. The origin and destination
  markers used to track changes all the time.

### C: header
- Each control is a static wrapper holding a `Backdrop` (1 pt `color.border` border, radius 22, clipped) and the
  Press. On iOS the backdrop has `BlurView tint="dark" intensity={30}`. On Android it has the old flat fill, and no
  blur method is set. The Press is no longer the backdrop, because iOS drops a blur whose parent is dimmed. A press
  now dims and scales the icon, not the circle. Tap targets are 44×44 and 50×44. The pill's buttons used to be 42
  tall inside the border.

## Risks and notes
- **iOS ignores the durations.** In react-native-maps 1.27 on Fabric iOS, `animateToRegion` and `animateCamera`
  call MapKit's `animated:YES`, which uses Apple's own timing. Android honours the 400 ms.
- If MapKit's `setRegion` ever keeps the pitch, the map snaps flat when `pitchEnabled` goes off at 1050 ms. Check
  that the settle is smooth.
- MapKit and Google both cap pitch at far zoom levels, so the tilt may look shallower than 45° at the fit-all zoom.
- The ticket says 45°. PLAN.md's Motion system says 55°. I built 45°.
- On Google Maps (Android with a key), markers are bitmaps. Because tracking is off after 1 s, the incident ring
  freezes there. Apple Maps markers are live views, so iOS pulses.
- The incident's 54 pt box may catch taps near the disc that used to reach the route line.

## Device checks (coordinator, iOS simulator, Metro 8082)
No native rebuild is needed. `expo-blur` and `expo-linear-gradient` are already in the dev client.

### Part A
1. Launch and wait for routes. The camera eases from the start region to fit both routes. It does not jump.
2. Tap the unselected route line, or its row. The camera eases to fit that route. Tap the other route, and it eases
   back. There is no tilt.
3. Open Demo mode, turn Demo mode on, and turn on "Accident on …". Close the sheet. The state is at risk and "Switch
   to …" shows.
4. Tap **Switch to …**. The camera tilts (up to 45°) toward the new route, then settles flat on it. Screenshot after
   about 1.5 s. The map must be flat and fitted to the selected route, and must stay still.
5. Two-finger tilt on the map afterwards does nothing, because pitch gestures are still off.
6. Optional: turn on Reduce Motion in Settings > Accessibility > Motion, then repeat steps 2 and 4. Every change is
   instant with no tilt.

### Part B
1. On time (Demo mode "Reset to start"): screenshot. There is an orange glow under the selected route, bubbles with
   a tail touching the road, and white and orange halos on the pins. The foot of the map fades into the black below it.
2. At risk (accident on): screenshot. The incident marker's ring spreads and fades about once a second, below its
   route. Pan and pinch the map, and it stays smooth.
3. Late ("Advance clock to mid-trip"): screenshot. The incident is red and the idle routes are dimmer.
4. Tap an ETA bubble. It selects that route (the fade does not block touches near the bottom edge).

### Part C
1. Pan the map so roads sit under the header controls. Screenshot. The round button and the pill show a blurred map
   inside the hairline border.
2. Open the Demo mode sheet and turn Demo mode on, then close it. The flask icon is orange.
