# 09 — Notice card, two recipients and history

**Items:** W4, W9, W8 · **Architecture:** `PLAN.md` → Phase G; Data model changes; Data model changes; Engine additions · **Decisions:** D10, D13, D7, D9

**Blocked by:** 03, 06

**Status:** ready-for-agent

**Reviewer:** required (persistence and notifications)

Parts are built in order, each test-first where its Testing line says so. The ticket is accepted only when every part's criteria hold.

Files not listed under a part are read-only. `SPEC.md`, `PLAN.md` and other tickets are never edited by the implementer.

## Part A — Shareable ETA card (W4)

Next to the notice's send buttons, "Share as card" makes an image: the selected route drawn as a line, "Arriving 9:15", "via Waiyaki Way", lateness, and the Fika mark, and shares it.

**Files:** new `mobile/src/notice/EtaCard.tsx`, new `mobile/src/notice/shareCard.ts`, `mobile/src/notice/NoticeSheet.tsx` (button), `mobile/src/today/path.ts` (a pure projection helper) + test, `mobile/app.json` (plugins if `expo-sharing` needs one), `design/DESIGN.md` (entry).

**Acceptance criteria**

- [ ] `projectPath(points, width, height, padding)` is pure and maps decoded lat/lng to SVG coordinates preserving aspect ratio; tested.
- [ ] `EtaCard` renders off-screen at 1080 × 1350 logical ratio: black background, route line in the state colour with origin and destination dots, the ETA in hero type, route and lateness, a small Fika glyph and "fika" wordmark. No map tiles (D9).
- [ ] `shareCard()` captures it with `react-native-view-shot` (`captureRef`, png, tmpfile) and shares: iOS via RN `Share.share({ url, message: noticeText })`; Android via `expo-sharing` with the image.
- [ ] The button "Share as card" sits under WhatsApp / SMS / Share, secondary style; a failure shows a short inline error, never a crash.
- [ ] Works for the late state and the at-risk state.

**Testing:** Test-first on `projectPath` (bounds, aspect, single point). Render test that EtaCard shows the ETA text. Full suite and typecheck.

**Device check (coordinator, D14):** Late preset → Review and send notice → Share as card: the iOS share sheet opens with an image preview. Screenshot.

## Part B — A second person to tell (W9)

The commuter can add a second contact with their own tone and language. The notice sheet's To row becomes a switch between them, and each shows "Sent" once its send button is pressed.

**Files:** `mobile/src/app/setup.tsx` (second contact block), `mobile/src/commute.ts` or `store/commute.ts` (validation), `mobile/src/notice/NoticeSheet.tsx`, `mobile/src/notice/useNotice.ts`, `mobile/src/notice/voice.ts`, `mobile/src/app/index.tsx` (pass contacts), tests alongside, `design/DESIGN.md` (entry).

**Acceptance criteria**

- [ ] Setup: under the contact fields, "Add another person" reveals a second name, phone and relationship; "Remove" hides it and drops `contacts[1]`. Validation matches the first contact's. Hidden when `flag('secondContact')` is off.
- [ ] Each contact's tone and language are stored on the contact (v2) and become the notice sheet's defaults for that contact; changing them in the sheet updates that contact only.
- [ ] Notice sheet: the To row shows one chip per contact; selecting one switches the recipient, the notice text (drafted for that contact's voice) and the send targets. The late card on Today shows the first contact.
- [ ] Pressing a send button marks that contact's chip "Sent" until the sheet closes (D10).
- [ ] With one contact, the sheet looks as it does today.

**Testing:** Test-first: validation with one and two contacts; voice per contact; switching recipient changes the draft request's recipient and voice (unit test on the hook's pure parts). Full suite and typecheck.

**Device check (coordinator, D14):** Setup: add Jane (friend, Sheng), save. Late preset → notice sheet → switch to Jane; text changes; press Share; chip shows Sent.

## Part C — History and weekly recap (W8)

Keep a small local history of mornings and notices, and show a recap card: "Last week: 4 on time, 1 late. Most-used road: Nairobi Expressway." Persistence ticket; the reviewer runs on it.

**Files:** new `mobile/src/store/history.ts` + test, new `mobile/src/engine/recap.ts` + test, new `mobile/src/today/RecapCard.tsx`, `mobile/src/app/index.tsx` (write once per day; placement), `mobile/src/notice/send.ts` (write on send), `mobile/src/demo/` (seeded recap fixture), `design/DESIGN.md` (entry).

**Acceptance criteria**

- [ ] `fika.history` holds `{ version: 1, rows: HistoryRow[] }` exactly as PLAN.md "Data model changes"; append trims to the newest 60; a corrupt value reads as empty and is overwritten on next write.
- [ ] A `morning` row is written at most once per Nairobi calendar day, from the first live evaluation that is not simulated and whose `now` is before the arrive-by; never in Demo mode.
- [ ] A `notice` row is written when a send button is pressed, with channel, recipient name, ETA and late minutes.
- [ ] `recap(rows, weekOf)` returns counts by state for the previous Monday–Friday, the most-used route label, notices sent, and null when there is no morning row that week.
- [ ] RecapCard shows under the routes in the on-time state when `flag('recap')` and a recap exists (D13); with Demo mode's saved routes on, a seeded fixture recap shows.
- [ ] Nothing is sent anywhere.

**Testing:** Test-first: history append, trim, once-per-day guard, corrupt value; `recap` over a fixture week, empty week, week boundary in Nairobi time. Full suite and typecheck.

**Device check (coordinator, D14):** Demo mode → Use saved routes: recap card shows the seeded numbers. Screenshot.

## Comments
