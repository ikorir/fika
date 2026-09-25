# 05 — First impression and honest states

**Items:** P8, P10, P10, P11 · **Architecture:** `PLAN.md` → Phase E; Phase F

**Blocked by:** 01

**Status:** ready-for-agent

**Reviewer:** at coordinator discretion

Parts are built in order, each test-first where its Testing line says so. The ticket is accepted only when every part's criteria hold.

Files not listed under a part are read-only. `SPEC.md`, `PLAN.md` and other tickets are never edited by the implementer.

## Part A — Empty states with intent (P8)

Replace bare lines of muted text with an `EmptyState`: a stroke icon, a title, one line of reason and one action. Used for no driving route, couldn't get routes (no data yet), and notifications turned off when the commuter asked for a reminder.

**Files:** new `mobile/src/ui/EmptyState.tsx`, `mobile/src/app/index.tsx` (the two messages), `mobile/src/today/PrimaryAction.tsx` or `reminders/useReminders.ts` (the notifications-off case), `design/DESIGN.md` (one behaviour entry).

**Acceptance criteria**

- [ ] `EmptyState` props: `icon` (SVG path), `title`, `body`, optional `action { label, onPress }`. Card styling from tokens (surface, radius 22).
- [ ] No route: title "No driving route", body names the two places, action "Edit commute" opens setup.
- [ ] No data and an error: title "Couldn't get routes", body is the error text, action "Try again" calls refresh. With data and an error the existing "these are the numbers Fika last got" line stays as it is.
- [ ] Reminder requested but notifications are off and cannot be asked: an EmptyState-style inline card with action "Open settings" (`Linking.openSettings()`).
- [ ] Copy follows DESIGN.md: plain, no emoji, sentence case.

**Testing:** Render tests for EmptyState (action pressed calls handler; no action renders no button). Full suite and typecheck.

**Device check (coordinator, D14):** Point the app at a bad API URL in a throwaway Metro session or turn network off on first load: the "Couldn't get routes" card shows and Try again works.

## Part B — Pull to refresh and live freshness (P10)

Let the commuter pull the Today screen to refresh, and make "Updated" tick on its own with a small dot that turns amber when stale.

**Files:** `mobile/src/app/index.tsx` (ScrollView only), `mobile/src/today/ActionArea.tsx`, `mobile/src/today/freshness.ts`, `mobile/src/today/freshness.test.ts`, `mobile/src/today/useNow.ts` if a ticking clock is needed.

**Acceptance criteria**

- [ ] The Today ScrollView has a `RefreshControl` tinted `color.accent`, refreshing while `loading` and data exists.
- [ ] The freshness label re-renders at least every 30 seconds without a fetch, from the real clock (not Demo mode's).
- [ ] A 6 px dot before the label: `color.onTime` when fresh, `color.atRisk` when stale; label text stays as `updatedLabel` returns it.
- [ ] The header refresh button still works.

**Testing:** Add freshness tests for the boundary at exactly `STALE_AFTER_MIN` and one minute either side (existing tests stay). Full suite and typecheck.

**Device check (coordinator, D14):** Pull down on Today: spinner in accent, numbers refresh, label updates. Leave the app open 10+ minutes of real time is not required; coordinator checks the dot colour at fresh state only.

## Part C — Splash fade, icon and small signals (P10)

Make the first second feel finished: the app fades in from the splash instead of popping, the app icon and splash are Fika's own, and taps behind the keyboard work in setup and the notice editor.

**Files:** `mobile/src/app/_layout.tsx`, `mobile/assets/images/*` (icon, splash, android adaptive, favicon), `mobile/assets/expo.icon/*` (iOS icon), `mobile/app.json` (only if paths change), `mobile/src/app/setup.tsx` and `mobile/src/notice/NoticeSheet.tsx` (`keyboardShouldPersistTaps` only), `design/DESIGN.md` (icon line).

**Acceptance criteria**

- [ ] When fonts and the commute are ready, the root renders inside a Reanimated view fading in over `motion.duration.slow`, and `SplashScreen.hideAsync()` runs as it does today.
- [ ] New icon: accent `#F28C38` background, a single white stroke glyph (a clock whose hand becomes a road curve, drawn in SVG and rasterised). Produced for every size and file `app.json` references; the Android monochrome is the glyph alone. Source SVG committed under `mobile/assets/source/`.
- [ ] Splash image is the glyph in white on black, at the width `app.json` already sets.
- [ ] `keyboardShouldPersistTaps="handled"` on the setup ScrollView and any ScrollView in the notice sheet.
- [ ] The expo-router default images are gone from `assets/images`.

**Testing:** Typecheck and full suite. Verify every path in `app.json` exists (`node -e` script listed in evidence).

**Device check (coordinator, D14):** Coordinator rebuilds the dev client (icon changes are native), checks the home-screen icon and the launch fade.

## Part D — Welcome screen (P11)

A first-run screen that says what Fika does in one line and offers two ways in: set up my commute, or try the sample commute. Shown once; the demo phone, already past it, never sees it.

**Files:** new `mobile/src/app/welcome.tsx`, `mobile/src/app/_layout.tsx` (routing), `mobile/src/commute.ts` or `store/` (a `fika.welcomed` key), `design/DESIGN.md` (screen entry).

**Acceptance criteria**

- [ ] On launch, if `fika.welcomed` is absent and no commute is stored, the app opens `welcome`; otherwise Today, as now.
- [ ] Welcome shows the icon glyph, "Know when to leave." as the title, one line "Fika checks the roads, tells you when to go, and writes the message if you'll be late.", a primary button "Set up my commute" (to setup) and a text button "Try it with a sample commute" (to Today on the seed commute).
- [ ] Either choice writes `fika.welcomed`; it never shows again after that, including after a reinstall-free app restart.
- [ ] Dark theme, Figtree, primary button per tokens; the glyph fades and rises in with the shared presets.

**Testing:** Unit test the pure `firstScreen({ welcomed, storedCommute })` decision. Full suite and typecheck.

**Device check (coordinator, D14):** Coordinator clears the app's storage (reinstall) and launches: welcome shows; tap sample; relaunch: Today shows.

## Comments
