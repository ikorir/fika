# 07 — Show the maths

**Items:** W1, W2, W3, W11 · **Architecture:** `PLAN.md` → Engine additions; Backend changes; Data model changes; Phase G · **Decisions:** D11, D8

**Blocked by:** 02, 03

**Status:** ready-for-agent

**Reviewer:** at coordinator discretion

Parts are built in order, each test-first where its Testing line says so. The ticket is accepted only when every part's criteria hold.

Files not listed under a part are read-only. `SPEC.md`, `PLAN.md` and other tickets are never edited by the implementer.

## Part A — Departure window strip (W1)

Show the six departure times Fika checked as a strip of blocks above the routes, coloured by arrival against the deadline, with the chosen departure raised. Makes "Fika checked six departure times" visible.

**Files:** new `mobile/src/engine/window.ts` + test, `mobile/src/engine.ts` (extract `deltaKind()` only, behaviour unchanged), new `mobile/src/today/DepartureWindow.tsx`, `mobile/src/app/index.tsx` (placement), `design/DESIGN.md` (behaviour entry).

**Acceptance criteria**

- [ ] `deltaKind(arriveAt, deadline, bufferMin, extraMin?)` is exported and used by `evaluate()` with no change in results (all engine tests pass unchanged).
- [ ] `departureWindow(samples, commute, evaluation)` returns one block per distinct `departAt`, sorted ascending: `departAt`, best `arriveAt` over that sample's routes, the route label, `kind`, `chosen` when `departAt === evaluation.departAt`. Samples with no routes are skipped.
- [ ] The strip sits between the hero and the route card, full width with screen insets; each block shows the departure time and is coloured by kind using the state tint and colour; the chosen block is raised (taller, brighter border).
- [ ] Tapping a block shows one line under the strip: "Leave 7:50 · arrive 8:52 via Limuru Road". Tapping again hides it. It does not change the evaluation.
- [ ] Hidden in the late state when the notice card replaces the routes.
- [ ] Works with Demo mode's clock and simulated delay (blocks recolour).

**Testing:** Test-first: `departureWindow` with the saved-routes fixture (`demo/saved-routes.json`): six sorted blocks, correct chosen, kinds match `evaluate()` per route; a sample with no routes is dropped. Render test that tapping a block shows its line. Full suite and typecheck.

**Device check (coordinator, D14):** Screenshot on time and at risk; tap two blocks.

## Part B — Why this time (W2)

Tapping the decision line opens a sheet that shows the maths: deadline, buffer, parking or pickup time, each checked departure with its arrival and verdict, which one Fika chose and why. Code does the maths; this shows it.

**Files:** new `mobile/src/engine/explain.ts` + test, new `mobile/src/today/WhySheet.tsx`, `mobile/src/today/Hero.tsx` (make the decision line pressable with a small info glyph), `mobile/src/app/index.tsx` (sheet state), `mobile/src/today/words.ts` (reason words), `design/DESIGN.md` (sheet entry).

**Acceptance criteria**

- [ ] `explain(evaluation, commute, samples)` returns `{ deadline, bufferMin, extraMin, extraLabel, rows: [{ departAt, arriveAt, route, kind, chosen }], reason }` where `reason` is one of `latest_on_time`, `leave_now_inside_buffer`, `no_route_on_time`, `on_the_road`. No prose in the engine.
- [ ] The sheet title is "Why <leave-by or Leave now>". Sections: the rule in one line ("Arrive by 9:00, minus 10 min buffer and 10 min parking"), then a row per departure with arrival coloured by kind and the chosen one marked, then the reason sentence from `words.ts`.
- [ ] The decision line gets `accessibilityRole="button"` and hint "Shows how Fika chose this time".
- [ ] Works in all three states and in Demo mode.

**Testing:** Test-first: `explain` on the saved fixture in on-time, at-risk (simulated delay) and late (mid-trip) evaluations gives the expected reason and chosen row. Render test that WhySheet lists every row. Full suite and typecheck.

**Device check (coordinator, D14):** Tap the decision line in each state; screenshot the sheet.

## Part C — Nairobi Expressway toll (W3)

Routes on the Nairobi Expressway carry a toll range from the backend, and the app shows it in the route's meta line: "34 min · Toll KES 170–500".

**Files:** new `backend/lib/tolls.ts` + test, `backend/lib/contract.ts`, `backend/lib/google-routes.ts` (attach toll) + test, `mobile/src/contract.ts` (`Route.toll`, `RouteView.toll`), `mobile/src/engine.ts` (pass through only), `mobile/src/today/RouteList.tsx`, `mobile/src/demo/saved-routes.json` (add `toll` to the Expressway route in every sample).

**Acceptance criteria**

- [ ] `Route.toll?: { fromKes: number; toKes: number }` in both contract copies, matching SPEC.md.
- [ ] `tolls.ts` holds one entry for the Nairobi Expressway: class 3 (private car) fares, lowest and highest, with a comment giving the source and the date checked. The coordinator's dispatch supplies the verified figures; do not invent them.
- [ ] `tollFor(label)` matches a route label containing "Expressway" (case-insensitive) and returns the range; any other label returns undefined. The routes endpoint sets `toll` on matching routes only.
- [ ] `RouteView.toll` passes through `evaluate()` unchanged; RouteList appends " · Toll KES 170–500" (formatted from the numbers) to the meta line.
- [ ] The saved-routes fixture's Expressway route carries the same range.

**Testing:** Test-first in the backend: `tollFor` matches and misses; the routes mapper adds `toll` only to the Expressway route. Mobile: RouteList render shows the toll text; saved fixture test still passes. Both suites and typechecks.

**Device check (coordinator, D14):** Demo mode → Use saved routes: the Expressway row shows the toll.

## Part D — Countdown ring (W11)

In the last 15 minutes before leave-by, a thin ring beside "in N min" drains with the clock. At zero the primary action pulses once.

**Files:** new `mobile/src/ui/CountdownRing.tsx`, new `mobile/src/today/countdown.ts` + test, `mobile/src/today/Hero.tsx`, `mobile/src/today/PrimaryAction.tsx` (one pulse).

**Acceptance criteria**

- [ ] `countdownFraction(now, leaveBy, windowMin = 15)` is pure: null outside the window or when leaveBy is null, else remaining/15 in [0, 1].
- [ ] Ring: 28 px, 3 px stroke, accent on `color.control` track, drawn with react-native-svg and animated with Reanimated; shown only in the on-time state inside the window (D11).
- [ ] Uses the app clock, so Demo mode's clock steps move it.
- [ ] When the fraction reaches 0, the primary action scales 1 → 1.04 → 1 once; not again until the next leave-by.
- [ ] Reduce motion: the ring still shows its fraction but does not animate between values; no pulse.

**Testing:** Test-first on `countdownFraction` at 16, 15, 7.5, 0 and −1 minutes. Full suite and typecheck.

**Device check (coordinator, D14):** Demo mode: step the clock toward leave-by; ring appears at 15 min and drains; screenshot at ~7 min.

## Comments

### Coordinator, 2026-09-25: verified toll figures for Part C

- Private cars are **class 3** on the Nairobi Expressway. Classes 1 and 2 are two- and three-wheelers, which are not allowed on it.
- Class 3 fares: **lowest KES 170**, for example JKIA to Eastern Bypass. **Highest KES 500**, Mlolongo to Westlands. So `{ fromKes: 170, toKes: 500 }`.
- The fares took effect on 1 January 2024. Source: Kenya Gazette Notice No. 17419, Vol. CXXV No. 266, 19 Dec 2023, under the Public Roads Toll Act (Cap. 407): https://nairobiexpressway.ke/downloads/NAIROBI_EXPRESSWAY_RATES_GAZETTE_071223.pdf
- No revision since, as reported in 2025–2026. Put the source and "checked 2026-09-25" in the `tolls.ts` comment.
