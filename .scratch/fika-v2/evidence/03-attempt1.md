# Ticket 03, attempt 1: one bottom sheet everywhere

Result: both parts are done and every acceptance criterion has a Jest test. Nothing is committed. `setup/Sheet.tsx`
is deleted but not staged.

## Checks (2026-09-25)

| Check | Result |
| --- | --- |
| `npm test` in `mobile/` | 34 suites, 331 of 331 pass. Before: 31 suites, 303 tests, so 28 are new. |
| `npm run typecheck` | clean (exit 0) |
| `grep -rn "Modal" mobile/src --include='*.tsx' \| grep "from 'react-native'"`, from the repo root | empty |
| D3 grep (`Pressable` from `react-native`) | one line, `ui/Press.tsx` only |
| React Compiler (babel script from tickets 01 and 02, `babel-plugin-react-compiler` 1.0.0) | Sheet, NoticeSheet, DemoSheet, Scenario, Icon, AddressSheet, PickerSheet, TimeSheet, Stepper, Step and RootLayout all compile with no errors. The script still flags a component that reads a ref during render. |
| `npx expo export --platform ios` into the scratchpad | bundles, 4.3 MB hbc, no warnings |
| Reanimated API check | every runtime name bottom-sheet 5.2.14 imports from Reanimated exists in 4.5.1. The one miss, `AnimateStyle`, is a type-only import in a `.d.ts`. |

## Files
- New: `mobile/src/ui/Sheet.tsx`, `ui/Sheet.test.tsx`, `setup/sheets.test.tsx`, `notice/NoticeSheet.test.tsx`.
- Changed: `mobile/src/app/_layout.tsx` (adds `GestureHandlerRootView` with `BottomSheetModalProvider`),
  `setup/AddressSheet.tsx` (import, `SheetTextInput`), `setup/PickerSheet.tsx` and `setup/TimeSheet.tsx` (import only),
  `notice/NoticeSheet.tsx`, `demo/DemoSheet.tsx`, `demo/DemoSheet.test.tsx` (4 tests added),
  `mobile/jest.setup.js` (bottom-sheet stand-in).
- Deleted: `mobile/src/setup/Sheet.tsx`. Nothing imports it now.
- `notice/NoticeParts.tsx` is unchanged because it has no text input. The message field is in `NoticeSheet.tsx`.

## How it works
- `visible` drives `present()` and `dismiss()`. The close button, Android back (a `BackHandler` listener while
  visible), a backdrop tap and a drag all go through one `close()`. It calls `onClose` only while the caller still has
  the sheet open, so each opening reports its close once. When the caller closes the sheet by turning `visible` off,
  `onClose` is not called back.
- The sheet uses `enableDynamicSizing`, with `maxDynamicContentSize` set to 90% of the window height and `topInset`
  set to the safe area. The body is a `BottomSheetScrollView` with `keyboardShouldPersistTaps="handled"`.
  `keyboardBehavior` is `interactive` and `keyboardBlurBehavior` is `restore`. On Android the input mode is
  `adjustResize`, Expo's default.
- Styling comes from the tokens: top radius 32, `color.surface`, a 36×5 handle in `color.border`, and a backdrop
  that is `color.scrim` at opacity 1, fading from index −1 to 0.
- `accessible={false}` is set on the modal. The library's default makes the whole sheet one VoiceOver element, which
  would also hide every control from argent's `describe`.
- The Jest stand-in in `jest.setup.js` shows content only between `present()` and dismissal, and calls `onDismiss`
  once. The backdrop is a button named "Close <title>". A test fires a drag as
  `fireEvent(getByTestId('bottom-sheet'), 'dragClose')`. `SheetTextInput` has the testID `sheet-text-input`.

## Decision needed: an optional `header` prop on `ui/Sheet`
The Notice and Demo headers are not "close and title". Notice has close, the tone switch centred, then a spacer. Demo
has close, the title, then the Demo mode switch. To keep both as they were, `ui/Sheet` takes an optional `header`
node that replaces the title text beside the close button, while `title` still names the sheet for the backdrop
label. The ticket lists five props, so this is a sixth. The alternative is changing the notice design.

## Risks
- The Picker and Address lists keep their inner RN `ScrollView` (the ticket limits those files to imports and text
  inputs). A vertical drag that starts on those rows bounces the inner list instead of dragging the sheet. Dragging
  from the handle or header works.
- The PLAN haptics map has a "selection" haptic on drag-dismiss in `ui/Sheet`. It is not in this ticket's criteria,
  so it is not built.
- The Notice backdrop label is now "Close Late notice" (was "Close the notice"). No test or code used the old label.
- On Android, touch inside sheets and `adjustResize` under edge-to-edge were not checked on a device.
- Reopening the same sheet within about 250 ms of closing it, while it is still animating out, may close it again.
  This is the library's present-during-dismiss race.

## Device checks (coordinator, iOS simulator, Metro 8082)
The dev client needs no rebuild: `@gorhom/bottom-sheet` is JS-only, and gesture-handler and Reanimated are already
native.

### Part A
1. Open Setup (the pencil on the map header). Tap **From**. The sheet rises with a grab handle and a scrim behind it.
   The keyboard comes up focused on "Search for From", and the sheet sits above the keyboard.
2. Type `Westlands`. Suggestions appear above the keyboard. Tap one while the keyboard is still up. It must pick on
   the first tap, the sheet closes, and the From row shows the place.
3. Tap **Arrive by**. Tap Hour + and Minute −, and the time updates. Drag the sheet down by its handle. The scrim
   fades as it goes, the sheet closes, and the Arrive by row keeps the new time.
4. Tap **Buffer**. Tap the dark scrim above the sheet. The sheet closes and Buffer is unchanged. Open Buffer again,
   pick 10 min, and it closes with Buffer at 10 min.
5. Tap the round ✕ on any sheet. It closes. Open it again, and it opens (checks that the close was reported once).
6. With `describe`, the sheet's controls are listed separately: Close, the title and the rows.

### Part B
1. In Demo mode, turn on "Advance clock to mid-trip", then close the Demo sheet and tap **Review and send notice**.
   The notice sheet shows: tone switch centred at the top, language chips, "To" row, message, locked chips, WhatsApp,
   SMS and Share.
2. Tap the message. The keyboard comes up, the sheet rides above it, and scrolling the sheet reaches the WhatsApp,
   SMS and Share buttons. Edit a word, dismiss the keyboard by dragging the content, then drag the sheet closed by its
   handle. Open it again and the edit is kept.
3. Switch the tone to Friend and the language to Swahili. The message rewrites. Tap Share, and the share sheet opens
   with the text.
4. Open the Demo sheet from the map header. Step the clock + and −, toggle "Use saved routes" off and on, tap
   **Reset to start**, then drag the sheet closed. The banner and times follow as before.
5. After closing the Demo sheet, open the notice sheet again (when late), and it opens. After closing that, open the
   Demo sheet, and it opens.
