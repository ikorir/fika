# Ticket 05, attempt 1: first impression and honest states

Result: all four parts are built in order and every acceptance criterion has a Jest test. Nothing is committed or staged.

## Checks (2026-09-25)

| Check | Result |
| --- | --- |
| `npm test` in `mobile/` | 44 suites, **413 of 413 pass**. Before: 38 suites, 377 tests, so 36 are new. No act or console warnings. |
| `npm run typecheck` in `mobile/` | `tsc --noEmit` clean, exit 0 |
| `app.json` asset paths (node script below) | 7 paths, 0 missing |
| `xcrun actool` on `assets/expo.icon` (copied to the scratchpad, `--platform iphoneos --app-icon expo`) | compiles with no warnings; the 120 px output is the white glyph on the accent ground |
| `npx expo export --platform ios` into the scratchpad | bundles, 4.3 MB hbc |
| React Compiler (babel script with `babel-plugin-react-compiler`, **not** `expo lint`) | RootLayout, WelcomeScreen, TodayScreen, EmptyState, PrimaryAction, Action, and all four reminder hooks compile. ActionArea bails out with "Existing memoization could not be preserved". The HEAD version bails out the same way (its `useMemo`), so this ticket did not cause it. |
| D3 grep (`Pressable` from `react-native`) | `ui/Press.tsx` only |
| `Animated` from `react-native` grep | empty |

The asset check:
```
node -e "const fs=require('fs'),path=require('path');const app=require('./app.json');const paths=[];
(function walk(v){if(typeof v==='string'){if(v.startsWith('./'))paths.push(v)}else if(v&&typeof v==='object')Object.values(v).forEach(walk)})(app);
let missing=0;for(const p of paths){const ok=fs.existsSync(path.resolve(p));if(!ok)missing++;console.log((ok?'ok      ':'MISSING ')+p)}
console.log(paths.length+' paths, '+missing+' missing');process.exit(missing?1:0)"
```
Output: `./assets/images/icon.png`, `./assets/expo.icon`, `android-icon-foreground.png`, `android-icon-background.png`,
`android-icon-monochrome.png`, `favicon.png`, `splash-icon.png`: all ok. 7 paths, 0 missing.

Red first: EmptyState (no module), TodayScreen (5 of 6 failed; the "data and error" test passed because it pins
behaviour that is unchanged), ActionArea dot (2), PrimaryAction and reminders (4), `store/welcomed` (no module),
RootLayout (5), Welcome (no module). Two groups passed at once because the code already did what they check: the
freshness boundary tests (added as the ticket asks), and the `keyboardShouldPersistTaps` tests. I removed the prop from
`setup.tsx` and from `ui/Sheet.tsx` in turn, and each of those tests went red. Both files were then restored.

## Files
- **A:** new `ui/EmptyState.tsx` and `.test.tsx`; `app/index.tsx`; `today/PrimaryAction.tsx` and its test;
  `reminders/useReminders.ts` and its test; `design/DESIGN.md`; new `today/TodayScreen.test.tsx`, which renders `app/index`
  with its data and native modules stubbed.
- **B:** `app/index.tsx` (the ScrollView); `today/ActionArea.tsx` and its test; `today/freshness.test.ts`.
- **C:** `app/_layout.tsx`; every PNG in `assets/images`; `assets/expo.icon/icon.json` and `Assets/fika-glyph.png`, with
  `expo-symbol 2.svg` and `grid.png` deleted; new `assets/source/fika-glyph.svg`; `DESIGN.md`. There is also a new
  `setup/SetupScreen.test.tsx` and a test added to `notice/NoticeSheet.test.tsx`. `app.json` is unchanged because no
  path changed.
- **D:** new `app/welcome.tsx`; new `store/welcomed.ts` and its test; `app/_layout.tsx`; `DESIGN.md`. New
  `RootLayout.test.tsx` and `WelcomeScreen.test.tsx`.

## How it works
- **EmptyState:** a card on `color.surface`, radius 22, 16 padding. It has a 24 pt stroke icon in muted grey, a title
  (rowTitle, marked as a header), a body (a muted note) and an optional action (a 50 pt pill on `color.control`).
  - The no-route and couldn't-get-routes cards sit 16 pt in, the same as the route card.
  - While a retry runs, "Try again" reads "Trying…". The card stays up during the retry, as the error box did.
  - With data and an error, the old line and button are unchanged.
- **Notifications off:** the reminder no longer calls `Alert.alert`. `useOneOffReminder` returns `blocked: true`.
  Because `blocked` is optional on `Reminder`, the fixtures in existing tests still type-check. While `blocked` is set
  and the state is on time, `PrimaryAction` shows the "Reminders are off" card in place of "Remind me at …", with
  "Open settings" (`Linking.openSettings()`). When the app comes back to the front and notifications are allowed,
  `blocked` clears and the button returns.
- **Freshness:** the Today clock (`useNow`, `new Date()`, every 30 s) already re-renders the footer without a fetch, so
  `useNow.ts` is unchanged. The label now sits in a row after a 6 pt dot: `onTime` while fresh, `atRisk` when stale.
  The label text and its amber stale colour are unchanged.
- **RefreshControl:** it spins while `loading && !!data`. It is tinted with `tintColor` and `colors` set to accent,
  and `progressBackgroundColor` is surface for Android. `onRefresh` calls `refresh`.
- **Fade:** the tree inside `GestureHandlerRootView` is an `Animated.View` with `FadeIn` (400 ms, the motion easing).
  The fade stays with reduce motion on, because it changes opacity only. The same reasoning was used for ticket 02's
  colour tween. `hideAsync` runs on `ready`, as it did before.
- **Welcome routing:** the layout reads `fika.welcomed` and `fika.commute` (one `multiGet`) before it hides the
  splash. `welcome` is behind `Stack.Protected guard={welcoming}` and `index` behind `guard={!welcoming}`. `setup` is
  always available. Choosing either way in sets `welcoming` false through `WelcomedContext` and writes
  `{version:1, at}`. The router then drops `welcome` and opens the first available screen, which is `index`.
  - "Set up my commute" also pushes `/setup`. The stack ends as `[setup]`, and setup's `close()` then does
    `replace('/')`. I checked this path in expo-router's StackRouter source (`getStateForRouteNamesChange`).
  - If storage cannot be read, the app opens on Today.

## Icon
The glyph is a ring open at the lower right, a hand at 12, and a second hand that runs out through the gap as an
S-shaped road. Stroke 7 on a 100 grid, round caps. It was rasterised with headless Chrome at 1024 px, then scaled with
ImageMagick. ImageMagick's own SVG renderer drew no strokes, and Chrome windows smaller than about 500 px render off
centre. The script is `.scratch/fika-v2/evidence/05-render-icons.py` (run `python3 05-render-icons.py <mobile dir> <tmp dir>`, then `magick -size 512x512 xc:'#F28C38' PNG24:assets/images/android-icon-background.png`); it frames the glyph by changing the viewBox span:

| File | Size | Span | Ground |
| --- | --- | --- | --- |
| `icon.png` | 1024, no alpha | 134 (glyph about 56% of the width) | accent |
| `android-icon-foreground.png` | 512 | 165 (inside the safe zone) | transparent |
| `android-icon-background.png` | 512 | none | solid `#F28C38` |
| `android-icon-monochrome.png` | 432 | 165, the glyph alone | transparent |
| `favicon.png` | 48 | 107 | accent |
| `splash-icon.png` | 456 (6 × the 76 pt `imageWidth`) | 80 | transparent, on the plugin's black |
| `expo.icon/Assets/fika-glyph.png` | 1024 | 134 | transparent |

`icon.json` has fill `solid` `srgb:0.94902,0.54902,0.21961` and one layer, with translucency off so the glyph stays
white. Shadow is neutral at 0.5.

## Risks and decisions
- **Changed assertion in an existing test.** In `useReminders.test.ts`, "stays silent when notifications are off"
  asserted that `Alert.alert` was called. The ticket replaces that alert with the card, so the test now asserts
  `blocked` and no alert. **Decision: accept.**
- **Welcome routing is checked only in Jest.** `Stack.Protected` is stubbed there, so the redirect needs the device
  check.
- **Spinner on every refresh.** On iOS, a refresh started by code (the header button or waking the app) shows the
  spinner and nudges the content down while it runs. The ticket's "refreshing while loading and data exists" asks for
  this.
- The apostrophes in "Couldn’t get routes" and "you’ll be late" are ’, to match the app's other copy.
- The welcome screen is not on the design canvas yet. `DESIGN.md` has it.

## Device checks (coordinator, D14)
The dev client must be rebuilt for the icon: `cd mobile && npx expo run:ios`. Metro is on 8082.

**A**
1. Stop the backend, or use Network Link Conditioner at 100% loss, then kill and relaunch. With no saved routes you
   see a card: a circled "!" icon, "Couldn’t get routes", the error text, and "Try again". Tap it: "Trying…", then the
   card again. Restore the network and tap "Try again": routes load and the card fades out.
2. With routes on screen, turn the network off and tap refresh in the header. The old muted line "Couldn’t refresh —
   these are the numbers Fika last got. …" and its "Try again" button look as before.
3. Settings > Notifications > Fika: off. On time, tap "Remind me at …". A "Reminders are off" card replaces the
   button, with "Open settings". Tap it: iOS Settings opens on Fika. Turn notifications on and switch back to Fika:
   "Remind me at …" returns.
4. No-route card (optional, needs a commute with no road, e.g. an island): "No driving route", "Fika found no way to
   drive from X to Y.", and "Edit commute" opens setup.

**B**
1. On Today with live data, pull down. The spinner is orange, the numbers refresh, and "Updated h:mm" changes to
   now. Pull again while in Demo mode with saved routes: nothing breaks, and there is no fetch.
2. The footer shows a 6 pt green dot before "Updated h:mm". The label text is as before.
3. The header refresh button still refreshes. The pull spinner shows while it runs.

**C**
1. After the rebuild, the home-screen icon is orange with the white clock-and-road glyph.
2. Cold launch: the splash is the white glyph on black, then the app fades in over about 0.4 s instead of popping.
3. Setup: focus the name field and, with the keyboard up, tap a row. It responds on the first tap. Late notice sheet:
   with the keyboard up, tap a language chip. It responds on the first tap.

**D**
1. Delete the app from the simulator, reinstall it, and launch. You see the welcome screen: the orange glyph rises
   in, then "Know when to leave.", the line, "Set up my commute" and "Try it with a sample commute".
2. Tap "Try it with a sample commute". Today opens on Ruaka → Upper Hill. Kill and relaunch: Today opens, with no
   welcome.
3. Reinstall again and tap "Set up my commute". Setup opens with the seed filled in. Tap ✕: Today. Relaunch: Today.
4. On a phone that already has a commute saved, like the demo phone, the welcome never shows. On the simulator,
   check by saving setup, deleting only `fika.welcomed`, and relaunching; it is not normally reachable.
