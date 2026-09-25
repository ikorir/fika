# 03 — One bottom sheet everywhere

**Items:** P4, P4 · **Architecture:** `PLAN.md` → Sheet system · **Decisions:** D4

**Blocked by:** 01

**Status:** ready-for-agent

**Reviewer:** at coordinator discretion

Parts are built in order, each test-first where its Testing line says so. The ticket is accepted only when every part's criteria hold.

Files not listed under a part are read-only. `SPEC.md`, `PLAN.md` and other tickets are never edited by the implementer.

## Part A — Shared bottom sheet (P4)

Build the one sheet every bottom sheet will use: `@gorhom/bottom-sheet` under the hood, the same props as today's `setup/Sheet.tsx`, a grab handle, drag to dismiss, a backdrop that fades with drag, and proper keyboard handling. Wire the providers at the root. Point `setup/Sheet.tsx` at it so the three setup sheets use it immediately.

**Files:** new `mobile/src/ui/Sheet.tsx`, `mobile/src/setup/Sheet.tsx` (becomes a re-export or is removed with imports updated), `mobile/src/app/_layout.tsx` (providers), `mobile/src/setup/AddressSheet.tsx`, `PickerSheet.tsx`, `TimeSheet.tsx` (imports and text inputs only).

**Acceptance criteria**

- [ ] `ui/Sheet` props: `visible`, `title`, `onClose`, `children`, optional `footer`. `visible` drives `present()` / `dismiss()`; any dismissal (drag, backdrop tap, close button, Android back) calls `onClose` exactly once.
- [ ] Styling from tokens: top radius 32, `color.surface` background, handle in `color.border`, backdrop `color.scrim` fading with the sheet's position, header with the existing round close button and title.
- [ ] `enableDynamicSizing`; content scrolls with `BottomSheetScrollView` when taller than 90% of the screen.
- [ ] `ui/Sheet` re-exports `BottomSheetTextInput` as `SheetTextInput`; the address search field uses it so the keyboard pushes the sheet up.
- [ ] `GestureHandlerRootView` and `BottomSheetModalProvider` wrap the app in `_layout.tsx`. No sheet is inside an RN `Modal` (D4).
- [ ] Address, picker and time sheets behave as before otherwise.

**Testing:** Render test with the library's Jest mock (or a manual mock in `jest.setup.js`): Sheet renders the title and children when visible, and the close button calls `onClose`. Existing setup tests stay green. Full suite and typecheck.

**Device check (coordinator, D14):** Setup screen: open From, type an address with the keyboard up, pick a result; open Arrive by and drag the sheet down to close; open a picker and tap the backdrop.

## Part B — Notice and Demo sheets on the shared sheet (P4)

Move the late notice sheet and the Demo mode sheet off RN `Modal` onto `ui/Sheet`. The notice editor uses the sheet's text input so the keyboard is handled.

**Files:** `mobile/src/notice/NoticeSheet.tsx`, `mobile/src/notice/NoticeParts.tsx` (text input only), `mobile/src/demo/DemoSheet.tsx`.

**Acceptance criteria**

- [ ] Neither file imports `Modal` from `react-native`.
- [ ] Notice sheet: tone switch, language chips, To row, editable message, locked chips and the three send buttons render as before; the message field is a `SheetTextInput`; with the keyboard up the send buttons stay reachable by scrolling.
- [ ] Demo sheet: scenarios, app clock steps, saved-routes switch and reset work as before; the sheet can be dragged closed.
- [ ] Opening the Demo sheet over an open notice sheet is not possible (the entry points are on different surfaces); opening one after closing the other works.

**Testing:** Existing notice and demo tests stay green; add a render test that NoticeSheet shows the locked chips when visible. Full suite and typecheck.

**Device check (coordinator, D14):** Late preset → Review and send notice → edit the message with keyboard up → drag close. Demo sheet: step clock, toggle saved routes, reset, drag close.

## Comments
