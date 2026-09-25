# Ticket 07, attempt 1: show the maths

Result: parts A, B, C and D are built in order, each test-first. Every acceptance criterion has a test at the named seam.
One sub-criterion of D (the pulse) holds in code but cannot be seen in the on-time state; see Decision 4. Nothing is
committed or staged.

## Checks (2026-09-25)

| Where | Check | Result |
| --- | --- | --- |
| `mobile/` | `npm test` | **59 suites, 591 of 591 pass** (before: 53 suites, 517 tests). 74 tests are new, and none of the old ones were changed or removed. `engine.test.ts` is byte-for-byte unchanged and passes. No act, LogBox or console warnings in the output. |
| `mobile/` | `npm run typecheck` | `tsc --noEmit` clean, exit 0 |
| `backend/` | `npm test` | **7 files, 88 of 88 pass** (before: 6 files, 79 tests). 9 are new. |
| `backend/` | `npm run typecheck` | clean, exit 0 |
| `mobile/` | React Compiler (babel with `babel-plugin-react-compiler`, **not** `expo lint`) | `DepartureWindow`, `WhySheet`, `Hero`/`Facts`/`Placeholder`, `PrimaryAction`/`useLeaveByPulse`/`Action`, `CountdownRing`, `RouteList`/`Radio` and `TodayScreen` all compile, with no bail-outs |

Red first, part by part:
- **A:** `window.test.ts` could not find its module.
- **A:** `DepartureWindow.test.tsx` could not find its module.
- **A:** three new TodayScreen strip tests failed.
- **B:** `explain.test.ts` could not find its module.
- **B:** 7 `words` tests failed.
- **B:** `WhySheet.test.tsx` could not find its module.
- **B:** three `Hero` button tests and two TodayScreen "why" tests failed.
- **C, backend:** `tolls.test.ts` could not find its module, and the mapper test failed.
- **C, mobile:** four fixture and `RouteList` tests failed, with type errors.
- **D:** `countdown.test.ts` could not find its module.
- **D:** two `Hero` ring tests and three pulse tests failed.
- **D, `CountdownRing`:** its tests were written with the component, then mutation-checked. Forcing "no animation" fails the drain test, and forcing "always animate" fails the reduce-motion test.

Test counts in the touched suites:

| Suite | Tests |
| --- | --- |
| `engine/window` | 15 |
| `engine/explain` | 8 |
| `today/countdown` | 8 |
| `today/DepartureWindow` | 4 |
| `today/WhySheet` | 6 |
| `ui/CountdownRing` | 4 |
| `today/words` | 11 (+7) |
| `today/Hero` | 30 (+7) |
| `today/PrimaryAction` | 6 (+3) |
| `today/RouteList` | 13 (+2) |
| `today/TodayScreen` | 20 (+7) |
| `demo/saved` | 8 (+2) |
| backend `tolls` | 7 |
| backend `google-routes` | +2 |

## Files

- **A:**
  - `engine.ts`: `deltaKind(arriveAt, deadline, bufferMin, extraMin = 0)` is exported. It takes ISO or epoch ms, and `evaluate()` uses it for every route's kind and for the state.
  - New `engine/window.ts` and its test.
  - New `today/DepartureWindow.tsx` and its test.
  - `app/index.tsx`: the strip sits in the same condition as `RouteList`.
  - `DESIGN.md`: a behaviour entry.
- **B:**
  - New `engine/explain.ts` and its test.
  - New `today/WhySheet.tsx` and its test.
  - `today/Hero.tsx`: `onWhy` makes the decision line a `Press` with the info glyph.
  - `today/words.ts`: `whyTitle`, `ruleLine`, `whyReason` and `standingWords`.
  - `app/index.tsx`: the sheet's state.
  - `DESIGN.md`: a sheet entry.
- **C, backend:**
  - New `lib/tolls.ts` and its test.
  - `lib/contract.ts`: `Toll`, plus `Route.toll` as optional.
  - `lib/google-routes.ts`: `toRoutes` sets `toll` only when `tollFor(label)` matches.
  - The test also checks that `RoutesResponse.parse` keeps `toll`. Without the contract field, zod would strip it.
- **C, mobile:**
  - `contract.ts`: `Toll`, `Route.toll?` and `RouteView.toll?`.
  - `engine.ts`: passes `toll` through.
  - `RouteList.tsx`: " · Toll KES 170–500".
  - `saved-routes.json`: `toll` on the Expressway route in all five samples. Nothing else in the file changed; I checked this by loading both versions.
- **D:**
  - New `today/countdown.ts` and its test.
  - New `ui/CountdownRing.tsx` and its test.
  - `Hero.tsx`: the ring sits before "in N min".
  - `PrimaryAction.tsx`: a one-time pulse, on a wrapper that renders nothing when there is no action.

## Decisions and risks

1. **Five saved samples, not six.** The fixture has five departures: 7:15, 7:30, 7:50, 8:00 and 8:15. The test checks
   those five, and a six-sample case: the fixture plus a live-style `now` sample, shuffled.
2. **Optional `simulation` argument.** `departureWindow` and `explain` take it as a 4th argument. Without it, Demo
   mode's delay could not recolour the blocks or the rows. The deadline is read back from the evaluation's routes, so
   the kinds always match `evaluate()`.
3. **Reason follows the rows.** `reason` comes from the best route's kind at the evaluated departure, and `on_the_road`
   from mid-trip. On the stage's at-risk step (Limuru +25 at 7:30), the Expressway still gets in by 8:50 at 7:30, so
   the reason is **`latest_on_time`**, not `leave_now_inside_buffer`, which would contradict the chosen row. At 7:50
   with the accident it is `leave_now_inside_buffer`, and at 8:00 it is `no_route_on_time`. **Decision:** accept this,
   or map the reason by state.
4. **The pulse cannot be seen on time (blocker for that sub-criterion).** On time, `PrimaryAction` renders nothing from
   leave-by − 10 min, because `remindAt` has passed. At zero there is no button to scale. The pulse does show whenever
   an action is on screen at zero, for example when the accident is applied at 7:30 and "Switch to Nairobi Expressway"
   pulses once. **Proposed:** accept this as built, or approve a design change, such as pulsing the hero value
   instead.
5. **Chosen block.** A block is chosen only when `evaluation.departAt` equals a sampled departure, as D8 says. When the
   screen says to leave now between samples, as happens live, no block is raised.
6. **SPEC.** SPEC's `RouteView` does not list `toll`, but the ticket requires it. I propose a one-line amendment.
7. **Live tolls.** They appear only once the backend with this change is deployed. I did not deploy.
8. **Copy.** On the road, the title reads "Why leave by 7:50". The rule line subtracts parking, while row arrivals
   include it; both follow the ticket's copy.

## Device checks (coordinator, D14)

No native change: `react-native-svg` was already linked. Reload the JS from Metro on 8082. No rebuild is needed.

Start with Demo mode → "Use saved routes" on. Demo mode starts at 7:30, leave-by 7:50, on time.

**A**
1. A strip sits between the hero and the route card: 7:15, 7:30 and 7:50 green, 8:00 amber, 8:15 red. 7:50 is taller,
   with a green border. **Screenshot (on time).**
2. Tap 8:00: "Leave 8:00 · arrive 8:58 via Limuru Road". The hero still reads "Leave by 7:50".
3. Tap 7:15: "Leave 7:15 · arrive 8:13 via Limuru Road". Tap 7:15 again: the line goes.
4. Demo → "Accident on Limuru Road" → close. 7:15 green; 7:30 green and raised; 7:50 amber; 8:00 and 8:15 red.
   **Screenshot (at risk).** Tap 7:50: "Leave 7:50 · arrive 8:53 via Nairobi Expressway".
5. Demo → "Advance clock to mid-trip". The notice card replaces the routes, and the strip goes too.

**B** (Demo off, then saved routes on again)
1. The decision line ends in an (i) glyph. Tap it: "Why leave by 7:50".
   - The rule: "Arrive by 9:00, minus 10 min buffer and 10 min parking".
   - Five rows, all via Limuru Road: 8:13, 8:29 and 8:49 green, 8:58 amber, 9:13 red.
   - 7:50 is tagged "Chosen".
   - The reason: "7:50 is the latest time Fika checked that still gets you there by 8:50, before your buffer."
   - **Screenshot.**
2. Accident on, then tap the line: "Why leave now".
   - Rows via the Expressway: 8:19 and 8:34 green, 8:53 amber, 9:02 and 9:16 red.
   - 7:30 is tagged "Chosen".
   - The reason starts "Leaving now is the latest time…".
   - **Screenshot.**
3. Mid-trip, then tap the line: 7:50 is chosen, and the reason reads "You left at 7:50, so Fika works out your arrival
   from the part of the trip still ahead." **Screenshot.**

**C:** with saved routes at 7:30, the Nairobi Expressway row's meta reads "53 min · 4 min traffic delay · Toll KES
170–500". Limuru Road and Kiambu Road show no toll.

**D:** with saved routes, clock 7:30, no accident:
1. No ring ("in 20 min").
2. Forward 5 min (7:35): a full accent ring appears before "in 15 min".
3. Forward again (7:40): the ring is two-thirds full, "in 10 min". **Screenshot.** The clock steps by 5 min, so ~7 min
   cannot be reached; 7:40 and 7:45 bracket it.
4. Forward to 7:45: one-third full.
5. Optional pulse: back to 7:30, then Demo → Accident on. "Switch to Nairobi Expressway" swells once, because
   leave-by moves to 7:30 = the clock.
6. Reduce motion on: the ring shows each value without easing, and there is no pulse.
