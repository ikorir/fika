# 02 — The Today screen in motion

**Items:** P3, P3, P7, P5 · **Architecture:** `PLAN.md` → Motion system · **Decisions:** D1

**Blocked by:** 01

**Status:** ready-for-agent

**Reviewer:** at coordinator discretion

Parts are built in order, each test-first where its Testing line says so. The ticket is accepted only when every part's criteria hold.

Files not listed under a part are read-only. `SPEC.md`, `PLAN.md` and other tickets are never edited by the implementer.

## Part A — Hero and status pill on Reanimated (P3)

Move the hero off the RN `Animated` API. The status pill background, dot colour and hero time colour tween between the three state colours from one shared value; the hero value crossfades and slides when its text changes ("Leave by 8:05" to "Leave Now"); the Claude-text pulse moves to Reanimated and `usePulse.ts` is deleted.

**Files:** `mobile/src/today/Hero.tsx`, `mobile/src/notice/NoticeCard.tsx` (its pulse only), delete `mobile/src/draft/usePulse.ts`, new `mobile/src/ui/useStateColor.ts`, new `mobile/src/ui/usePulse.ts` (Reanimated).

**Acceptance criteria**

- [ ] `useStateColor(state)` holds a shared value 0/1/2 for on time / at risk / late, animates it with `motion.duration.base`, and returns animated styles for background (tint), foreground (colour); `interpolateColor` over the theme's state colours.
- [ ] Pill background, dot and pill label use it; the hero time uses the foreground colour only when not on time (white on time, as today).
- [ ] Hero value text changes with `FadeOut` / `FadeInDown` from `useMotion()`, keyed on the text; with reduce motion it swaps instantly.
- [ ] The pulse on Claude-pending text in Hero and NoticeCard runs on Reanimated with the same timing as before; `draft/usePulse.ts` no longer exists and nothing imports `Animated` from `react-native`.
- [ ] No visual change at rest compared with the mock-ups.

**Testing:** Unit test the state-to-index mapping. Render test: Hero renders each state without throwing and shows the right label and value. Full suite and typecheck.

**Device check (coordinator, D14):** Demo mode: on time → accident (at risk) → mid-trip (late) → reset. Colours tween, hero text slides, no flicker; screenshot each state.

## Part B — Route, card and banner transitions (P3)

Stop the rest of the Today screen from snapping. Route rows animate their layout when order or selection changes and the radio springs in; the notice card, the error box and the simulation banner enter and exit with the shared presets.

**Files:** `mobile/src/today/RouteList.tsx`, `mobile/src/today/SimulationBanner.tsx`, `mobile/src/notice/NoticeCard.tsx` (entering/exiting only), `mobile/src/app/index.tsx` (error box wrapper only).

**Acceptance criteria**

- [ ] Each route row is an `Animated.View` with `layout` from `useMotion()`.
- [ ] The selected radio's inner check scales from 0 to 1 with a spring on select; with reduce motion it appears instantly.
- [ ] Notice card, error box and simulation banner use `entering={enter}` and `exiting={exit}`.
- [ ] Selecting a route, turning a simulation on or off, and a failed refresh show no layout jump or double render.

**Testing:** Render tests: RouteList with two routes renders both, selection state is exposed through `accessibilityState`. Full suite and typecheck.

**Device check (coordinator, D14):** Tap each route; trigger the accident and reset; turn airplane-style failure by pointing to a bad API URL is not needed, just confirm banner in/out and notice card in on the late preset.

## Part C — Rolling digits on times (P7)

When a time on screen changes, the digits roll instead of being replaced. Used on the hero value and on each route's arrival time.

**Files:** new `mobile/src/ui/RollingDigits.tsx`, new `mobile/src/ui/digits.ts` (pure), `mobile/src/ui/digits.test.ts`, `mobile/src/today/Hero.tsx`, `mobile/src/today/RouteList.tsx`.

**Acceptance criteria**

- [ ] `diffDigits(prev, next)` is pure: aligns two strings from the right and returns per-character `{ char, changed, direction: 'up'|'down'|null }`; non-digits never roll.
- [ ] `RollingDigits` renders a text style it is given; changed digits slide vertically out and in with `motion.duration.base`, direction by whether the new digit is larger.
- [ ] A change in length ("9:55" → "10:05") renders correctly.
- [ ] Word values ("Now" in "Leave Now") fall back to the hero's crossfade from ticket 02 (hero part); RollingDigits only runs when both values are clock times.
- [ ] With reduce motion the text swaps instantly.

**Testing:** Test-first on `diffDigits`: equal strings, one digit up, one down, length change, colon unchanged, non-time strings. Render test that RollingDigits shows the final text. Full suite and typecheck.

**Device check (coordinator, D14):** Refresh with different numbers (Demo accident on/off changes arrivals): digits roll on route arrivals and hero.

## Part D — Skeletons instead of a spinner (P5)

On first load, the Today screen shows the hero and the route card as shimmering placeholder blocks at their real sizes, and the lone spinner goes. The shimmer is shared so all blocks move in phase.

**Files:** new `mobile/src/ui/Skeleton.tsx`, `mobile/src/today/Hero.tsx`, `mobile/src/today/RouteList.tsx` (export a `RouteListSkeleton`), `mobile/src/app/index.tsx` (replace the spinner only).

**Acceptance criteria**

- [ ] `Skeleton` provides a context with one shared shimmer value and a `Skeleton.Block` taking width, height and radius; colour moves between `color.surface` and `color.surfaceRaised`.
- [ ] While loading with no data: pill, hero label, hero value and decision line blocks sized like the real ones, then a route card with three row blocks.
- [ ] `ActivityIndicator` is no longer imported by `app/index.tsx`.
- [ ] When data arrives the placeholders fade out and the real content fades in, no layout shift of the map.
- [ ] Reduce motion: static blocks, no shimmer.

**Testing:** Render test: Hero with no evaluation and `loading` shows the skeleton (accessible label "Loading"), and with an evaluation shows the time. Full suite and typecheck.

**Device check (coordinator, D14):** Kill and relaunch the app with the network slow (or airplane mode on the Mac then off): skeleton shows, then content.

## Comments
