# Ticket 02, attempt 1: the Today screen in motion

Result: all four parts are built in order, tests first. Nothing is committed and nothing is staged.

## Checks (run 2026-09-25)

| Check | Result |
| --- | --- |
| `npm test` in `mobile/` | 31 suites, **303 of 303 pass**: the 234 existing tests plus 69 new ones. No act or console warnings. |
| `npm run typecheck` in `mobile/` | `tsc --noEmit` is clean, 0 errors |
| `grep -rn "Animated" mobile/src --include='*.tsx' --include='*.ts' \| grep "from 'react-native'"` (repo root, bash) | **empty** (exit 1) |
| `mobile/src/draft/usePulse.ts` | deleted |
| `ActivityIndicator` in `app/index.tsx` | not imported |
| D3 grep for `Pressable` from `react-native` | still only `mobile/src/ui/Press.tsx:2` |
| React Compiler (a babel script that runs `babel-plugin-react-compiler` 1.0.0 over each changed file and logs events, **not** `expo lint`) | every component compiles, with no CompileError: Hero, Facts, Placeholder, RouteList, RouteListSkeleton, Radio, SimulationBanner, NoticeCard, TodayScreen, RollingDigits, Rolling, Place, Skeleton, Block, useStateColor, usePulse. I checked that the script flags a component that reads a ref during render. |

Red first: the Part A tests failed on the missing `useStateColor` and `usePulse` modules and on the missing pill and value
animations (4 failures). In Part B, 10 of 13 tests failed. Part C: `digits.test.ts` and `RollingDigits.test.tsx`
failed to run because their modules did not exist. Part D: 5 failures, and the Skeleton suite did not run.

New tests: `ui/useStateColor.test.tsx` (6), `ui/usePulse.test.tsx` (3), `ui/digits.test.ts` (21),
`ui/RollingDigits.test.tsx` (8), `ui/Skeleton.test.tsx` (4), `today/Hero.test.tsx` (+12),
`today/RouteList.test.tsx` (+9), `today/SimulationBanner.test.tsx` (3), `notice/NoticeCard.test.tsx` (3).

## Files

- **Part A.** New: `ui/useStateColor.ts` and `ui/usePulse.ts`. Deleted: `draft/usePulse.ts`. Changed: `today/Hero.tsx` and
  `notice/NoticeCard.tsx` (the pulse).
- **Part B.** `today/RouteList.tsx` (row `layout`, the `Radio` spring), `today/SimulationBanner.tsx`,
  `notice/NoticeCard.tsx` (an `Animated.View` wrapper with `entering`/`exiting`), and `app/index.tsx` (the error box wrapper).
- **Part C.** New: `ui/digits.ts` and `ui/RollingDigits.tsx`. They are used by `Hero.tsx` (the value) and
  `RouteList.tsx` (the arrivals).
- **Part D.** New: `ui/Skeleton.tsx`. `Hero.tsx` gains a `loading` prop and a `Placeholder`, `RouteList.tsx` exports
  `RouteListSkeleton`, and `app/index.tsx` replaces the spinner.

## Judgement calls

- **Colour tween.** `useStateColor` returns `background`, `foreground`, `fill` (the dot) and `alert`. `alert` is white on
  time and the state colour otherwise, so the hero time tweens from white instead of flashing green. The colours tween
  with reduce motion on too, because a colour change is not movement. The pulse likewise ignores reduce motion, as it did before.
- **Hero value key.** The value is keyed `'clock'` for any time and by the word itself otherwise. Time to time rolls in
  place. Anything involving a word crossfades with `FadeOut`/`FadeInDown`. The whole Facts block fades in once.
  `LayoutAnimationConfig skipEntering` stops the value and the past-leave-by line from animating a second time inside it.
- **Hero layout.** It has two extras, both needed so that "selecting a route shows no layout jump" holds.
  - The past-leave-by line enters and exits with the presets.
  - The words block and the route card move with `layout`.
- **RollingDigits.** The whole string is always laid out, which keeps the width right and keeps the text accessible. While
  the digits roll, the whole string is hidden (opacity 0) under an overlay of single characters. The overlay is removed
  after `duration.base`. The slide distance is the measured line height.
- **Skeleton.** There is one module-level shimmer value for the whole app, reference-counted. So the hero and route-card
  skeletons are in phase even though each has its own `<Skeleton>` root. A test mounts one late and checks it matches.
- **Error box (index.tsx).** `useRoutes` clears `error` while a retry runs. Before this change, the box would leave and
  then come back, and with exit and enter animations the two would overlap. The box now stays up through a retry,
  saying "Trying…", which that label was already written for. Skeletons are shown only when no error is showing
  (`firstLoad = loading && !data && !shownError`).

## Device checks (coordinator, D14)

Reload the JS on Metro 8082. No native change.

**A: colours and value.**
1. Demo mode, on time: the pill is green and the hero reads "Leave by 7:50" in white. Screenshot.
2. Accident: the pill, dot and label tween to amber over about 0.25 s. "7:50" fades out and "Now" drops in. Screenshot.
3. Mid-trip: they tween to red, and "Arriving 9:13" crossfades in. Screenshot.
4. Reset: back to green and white. Look for flicker at every step.
5. While Claude's words load, the decision line and the notice text breathe at 1.3 s.

**B: transitions.**
1. Tap each route: the tick springs in and the rows do not jump.
2. Accident on, then Reset: the banner fades in and then out.
3. Late preset: the notice card fades in, and the route card fades out or moves.

**C: rolling digits.** Toggle the accident on and off. The arrivals roll, 8:49 to 8:54 and back. Tap routes on time:
the hero digits roll.

**D: skeletons.** Kill the app, set Network Link Conditioner (or the Mac's airplane mode), then relaunch. You should see
the pill, label, time and decision blocks and a route card with three rows, all shimmering together. Restore the
network: the placeholders fade and the content fades in, and the map does not move.

**All parts, reduce motion on.** Every swap is instant, the ticks appear at once, and the skeleton is static.

## Risks and decision needed

- **Banner shift.** When the banner enters or exits, the ScrollView below still shifts by the banner's height (about 30
  pt) at once. The ScrollView is outside my files. The fix is one line in `index.tsx`: make it an
  `Animated.ScrollView` with `layout={layout}`. **Decision:** allow that line?
- **Jest limitation.** Jest reports a shared animated style on the last view attached only. On a device all views update.
- **Placeholder colour.** The placeholders inside the route card fade into the card colour at the bottom of each shimmer
  (surface), as the ticket specifies.
