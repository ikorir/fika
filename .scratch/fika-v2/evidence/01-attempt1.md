# Ticket 01, attempt 1: motion foundations, haptics, large text

Result: all three parts built, test-first. Nothing committed.

## Checks (run 2026-09-25)

| Check | Result |
| --- | --- |
| `npm test` in `mobile/` | 23 suites, **232 passed / 232** (170 existing + 62 new), 0 failed |
| `npm run typecheck` in `mobile/` | `tsc --noEmit` clean, 0 errors |
| D3 grep (run under bash; zsh needs `'--include=*.tsx'` quoted) | one line: `mobile/src/ui/Press.tsx:2:import { Pressable, type PressableProps, StyleSheet } from 'react-native';` |

Red first: Press tests failed on the missing module, haptics tests on the missing module, the six call-site tests
failed with 0 haptic calls (10 failures), and the Part C tests failed before `heroSize`/`useFontScale` existed.
A mutation run on Press (pressed opacity 0.5, reduce motion ignored) turned 3 of its animation tests red.

## Installs

`npx expo install expo-haptics expo-blur expo-linear-gradient @gorhom/bottom-sheet react-native-view-shot expo-sharing expo-calendar expo-background-task`
picked: `@gorhom/bottom-sheet ^5.2.14`, `expo-background-task ~57.0.20`, `expo-blur ~57.0.3`, `expo-calendar ~57.0.5`,
`expo-haptics ~57.0.3`, `expo-linear-gradient ~57.0.2`, `expo-sharing ~57.0.22`, `react-native-view-shot 5.1.0`.
Dev: `@testing-library/react-native ^14.0.1` and its peer `test-renderer ^1.3.0` (RNTL 14 needs it; listed explicitly).

Expo printed: "Cannot automatically write to dynamic config at: app.config.js. Add plugins expo-sharing,
expo-background-task". Not added: D2 says config plugins arrive with the ticket that uses each module. `app.json`
is untouched.

## Files

Part A: `package.json`, `package-lock.json`, `jest.setup.js` (worklets Jest stand-in + `setUpTests()`, and an
`expo-haptics` stand-in), `theme.ts` (`motion`), new `ui/Press.tsx`, `ui/motion.ts`, `ui/useReduceMotion.ts`; the
Pressable→Press swap (import + element only) in `app/index.tsx`, `app/setup.tsx`, `demo/DemoSheet.tsx`,
`notice/NoticeCard.tsx`, `notice/NoticeSheet.tsx`, `notice/VoiceControls.tsx`, `setup/AddressSheet.tsx`,
`setup/PickerSheet.tsx`, `setup/Rows.tsx`, `setup/Sheet.tsx`, `setup/TimeSheet.tsx`, `today/ActionArea.tsx`,
`today/HeaderControls.tsx`, `today/PrimaryAction.tsx`, `today/RouteList.tsx`.

Part B: new `ui/haptics.ts` (`select`, `reminderSet`, `stateChanged`, `sent`, pure `stateHaptic`, and
`useStateHaptic` for the index effect); `Press` gains `haptic?: 'select'`; call sites `RouteList` (row),
`VoiceControls` (tone + language), `DemoSheet` (the two scenario rows only), `useReminders` (after a set),
`send.ts` (one `sent()` per press, before any link, however many fallbacks), `app/index.tsx`
(`useStateHaptic(evaluation?.state)`).

Part C: `theme.ts` (`type.heroCompact`, 52/52), new `ui/useFontScale.ts` (+ `LARGE_TEXT_CAP = 1.6`), `Hero.tsx`
(`heroSize()`), `RouteList.tsx`, `PrimaryAction.tsx`.

Tests added: `ui/Press.test.tsx` (13), `ui/motion.test.ts` (6), `ui/haptics.test.ts` (21), `ui/useFontScale.test.ts`
(2), `today/Hero.test.tsx` (7), `today/RouteList.test.tsx` (2), `today/PrimaryAction.test.tsx` (1),
`notice/VoiceControls.test.tsx` (2), `notice/send.test.ts` (4), `demo/DemoSheet.test.tsx` (2),
`reminders/useReminders.test.ts` (2).

## Judgement calls

- `stateHaptic(x, x)` gives nothing (no change, no buzz); undefined `from` gives nothing. A gap with no evaluation
  (reload) is skipped, so the next state compares with the last one shown.
- Press dims from the style's own opacity (keeps `styles.dim` / disabled 0.4 correct at rest) and owns `transform`.
  It re-renders on press only when `style` is a function.
- `useReduceMotion` seeds from Reanimated's start-up value so the first frame is right, then follows
  `AccessibilityInfo`. `useFontScale` re-reads on `AppState` active and also on `Dimensions` change (in case the
  new scale lands after the app is already active).
- Part C goes slightly past the named texts, inside Part C files, to meet "no clipped or overlapping text": 1.6 cap on
  the hero label, status pill label and aside, the Routes header and Best tag, and the primary action label; pill
  `height` → `minHeight` (28 either way at 1.0); hero aside `flexShrink: 1` so it wraps beside the time rather than
  running under it. None of these changes a 1.0 layout unless the aside already overflowed there.

## Manual device checks (coordinator, D14)

Rebuild first: new native modules. `cd mobile && npx expo run:ios`.

### Part A — press feedback
1. Launch Fika; Today renders with routes, hero and primary action as before (compare with a pre-ticket screenshot:
   no difference at rest).
2. Press and hold each: a route row, Edit commute, Demo mode, Refresh, the primary action, "Open in Google Maps".
   Each dips (97%) and dims (85%) while held and springs back on release; each still does its job on release.
3. Open Setup: hold a row (From/To/Arrive by), a mode chip, Close, Save. Same dip. Open a picker/address/time sheet;
   tap outside the sheet: it still closes.
4. Open Demo mode: turn it off; "Reset to start" stays dimmed (0.4) at rest and dims further while held.
5. Settings > Accessibility > Motion > Reduce Motion on, back to Fika: pressing now only dims, no scale. Turn it off.

### Part B — haptics (the simulator has no haptic engine: check for no crash and no errors in the Metro log)
1. Switch routes by tapping a route row: light impact.
2. On time: tap "Remind me at …": success notification; tap again to drop: nothing.
3. Demo mode on; tap "Accident on …": light (scenario) then warning (state becomes at risk).
4. Tap "Advance clock to mid-trip": light, then error (state becomes late).
5. Tap the clock − / + buttons: the buttons give nothing (a state change they cause still buzzes once).
6. Open the notice: tap Friend/Manager and a language chip: light. Tap WhatsApp, SMS, Share: medium before each opens.
7. Metro log: no `expo-haptics` errors or unhandled rejections.

### Part C — large text
1. Baseline: default text size, screenshot Today on time, and late (Demo mode, mid-trip).
2. Set the largest accessibility text size (Settings > Accessibility > Display & Text Size > Larger Text, slider to
   max), return to Fika (foreground re-reads the scale).
3. Screenshot on time and late. Expect: hero time 52 pt, capped so it never beats 76.8 pt; status pill, aside,
   route texts grown no more than 1.6×; long route names end in "…" with the arrival column on screen; primary
   action label on one line (shrinks to 80%, then "…"); nothing clipped or overlapping.
4. Set the text size back to default, return to Fika, screenshot: identical to step 1.

## Risks

- Device feel of the press dip and the haptics is untested here (Jest only).
- Plugins for `expo-sharing`, `expo-background-task`, `expo-calendar` are not configured (D2 defers them); the dev
  client should still build, but those modules are not usable until their tickets add them.
- Default `hitSlop` 8 on the adjacent Demo/Refresh pill buttons overlaps at their shared edge; the later one wins there.
