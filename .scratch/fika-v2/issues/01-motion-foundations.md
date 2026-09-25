# 01 — Motion foundations, haptics and large text

**Items:** P1, P9 (hook), P2, P9 · **Architecture:** `PLAN.md` → Motion system; Haptics map; Motion system (text scale note in Phase A) · **Decisions:** D1, D2, D3, PLAN.md Haptics map

**Blocked by:** none

**Status:** ready-for-agent

**Reviewer:** at coordinator discretion

Parts are built in order, each test-first where its Testing line says so. The ticket is accepted only when every part's criteria hold.

Files not listed under a part are read-only. `SPEC.md`, `PLAN.md` and other tickets are never edited by the implementer.

## Part A — Motion foundations and Press (P1, P9 (hook))

Lay the ground every later ticket stands on. Install all v2 native dependencies in one go (PLAN.md D2) and the render-test library, set Jest up for Reanimated, add motion tokens, and replace every bare `Pressable` with one `Press` component that scales and dims on press. Add the reduce-motion hook and the motion presets that return nothing when reduce motion is on.

**Files:** `mobile/package.json`, `mobile/package-lock.json`, `mobile/jest.setup.js`, `mobile/src/theme.ts` (add `motion` only), new `mobile/src/ui/Press.tsx`, `mobile/src/ui/motion.ts`, `mobile/src/ui/useReduceMotion.ts`, and every file under `mobile/src` that imports `Pressable` (swap the import and element only; no other change to those files).

**Acceptance criteria**

- [ ] `npx expo install expo-haptics expo-blur expo-linear-gradient @gorhom/bottom-sheet react-native-view-shot expo-sharing expo-calendar expo-background-task` has run; versions are the SDK-57 ones Expo picks. `@testing-library/react-native` is a dev dependency.
- [ ] `theme.motion` exists: `duration { fast: 150, base: 250, slow: 400 }`, `easing` (ease-out cubic), `pressScale: 0.97`.
- [ ] `ui/Press.tsx` wraps `Pressable`: animates scale to `pressScale` and opacity to 0.85 while pressed with Reanimated, default `hitSlop` 8, passes through every Pressable prop including `style` (function or object), `accessibilityRole`, `accessibilityState`, `disabled`. A disabled Press does not animate.
- [ ] `ui/useReduceMotion.ts` returns the live `AccessibilityInfo.isReduceMotionEnabled` value and updates on change.
- [ ] `ui/motion.ts` exports `useMotion()` returning `{ enter, exit, layout }` Reanimated presets bound to the tokens, each `undefined` when reduce motion is on. Press does not scale when reduce motion is on (opacity still changes).
- [ ] D3 holds: `grep -rn "Pressable" mobile/src --include=*.tsx | grep "from 'react-native'"` finds only `ui/Press.tsx`.
- [ ] Jest runs Reanimated components (its official test setup in `jest.setup.js`). All 170 existing tests still pass.

**Testing:** Test-first for Press: render tests with `@testing-library/react-native` that a press calls `onPress`, a disabled Press does not, and accessibility props pass through. Unit test that `useMotion` returns undefined presets when reduce motion is on (mock `AccessibilityInfo`). Full `npm test` and `npm run typecheck` in `mobile/`.

**Device check (coordinator, D14):** After the coordinator rebuilds the dev client (`npx expo run:ios`): Today screen renders, route rows, header controls, primary action and setup rows respond to taps and visibly dip on press.

## Part B — Haptics on the moments that matter (P2)

Add one haptics module with one function per moment and call it from the six places in the PLAN.md haptics table. Haptics are independent of reduce motion. The Demo mode clock steps do not buzz; state changes caused by a simulation do.

**Files:** new `mobile/src/ui/haptics.ts`, `mobile/src/ui/haptics.test.ts`; call sites in `today/RouteList.tsx`, `notice/VoiceControls.tsx` (tone and language chips), `demo/DemoSheet.tsx` (scenario rows only), `reminders/useReminders.ts` (reminder set), `notice/send.ts`, `app/index.tsx` (state-change effect). `ui/Press.tsx` may gain an optional `haptic` prop.

**Acceptance criteria**

- [ ] `ui/haptics.ts` exports `select()`, `reminderSet()`, `stateChanged(from, to)`, `sent()`, backed by `expo-haptics`; all calls are fire-and-forget and never throw (a failing native call is swallowed).
- [ ] `stateChanged` is a pure mapping plus a call: to `at_risk` gives a warning notification, to `late` an error notification, to `on_time` nothing, and no call when `from` is undefined (first evaluation of a launch).
- [ ] Route row select and tone/language chip taps give a light impact. Reminder set gives a success notification; clearing it gives nothing.
- [ ] Pressing WhatsApp, SMS or Share gives a medium impact before the link opens.
- [ ] Demo mode's clock back/forward buttons do not call haptics.

**Testing:** Test-first: unit tests for the state mapping (`stateHaptic(from, to)` pure helper) covering all nine pairs plus undefined; mock `expo-haptics` and assert `select()` is called when a RouteList row is pressed (render test). Full suite and typecheck.

**Device check (coordinator, D14):** Switch routes, toggle the reminder, trigger the accident preset (state goes at risk), advance clock to mid-trip (late). No crash; logs show no haptics errors.

## Part C — Large text holds together (P9)

At large system text sizes the Today screen must not break. The hero time shrinks from 64 to 52 above a 1.3 font scale, and the hero, route rows and primary action keep their layout without clipped or overlapping text.

**Files:** `mobile/src/theme.ts` (type only), `mobile/src/today/Hero.tsx`, `mobile/src/today/RouteList.tsx`, `mobile/src/today/PrimaryAction.tsx`, new `mobile/src/ui/useFontScale.ts`.

**Acceptance criteria**

- [ ] `useFontScale()` returns `PixelRatio.getFontScale()` and updates when the app returns to the foreground.
- [ ] Hero time is 64 px at scale ≤ 1.3 and 52 px above it, with `maxFontSizeMultiplier` set so it never exceeds 64 × 1.2 on screen.
- [ ] Route name, meta, arrival and delta texts have `maxFontSizeMultiplier` 1.6; route name truncates with an ellipsis before it pushes the arrival column off-screen.
- [ ] Primary action label keeps one line with `adjustsFontSizeToFit` and `minimumFontScale` 0.8.
- [ ] Nothing else about the layout changes at scale 1.0.

**Testing:** Unit test the pure `heroSize(scale)` helper at 1.0, 1.3, 1.31 and 2.0. Full suite and typecheck.

**Device check (coordinator, D14):** Coordinator sets simulator text size to the largest accessibility size and back, screenshots Today in on-time and late states.

## Comments
