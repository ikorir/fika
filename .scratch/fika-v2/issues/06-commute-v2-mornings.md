# 06 — Commute v2 and smarter mornings

**Items:** P11, W6, W12 · **Architecture:** `PLAN.md` → Data model changes; Engine additions; Engine additions; Backend changes (background reminder) · **Decisions:** D5, D6, D7

**Blocked by:** 03

**Status:** ready-for-agent

**Reviewer:** required (persistence and notifications)

Parts are built in order, each test-first where its Testing line says so. The ticket is accepted only when every part's criteria hold.

Files not listed under a part are read-only. `SPEC.md`, `PLAN.md` and other tickets are never edited by the implementer.

## Part A — Commute v2, flags and settings rows (P11)

Evolve the stored commute to v2 without losing anything on a phone that has v1, add feature flags, add the effective-commute function and the new morning-reminder scheduling (D5, D6), and add two setup rows: "Quiet on weekends" and per-weekday arrive-by. This is a persistence and notifications ticket; the reviewer runs on it.

**Files:** `mobile/src/contract.ts` (Commute v2 and Contact), `mobile/src/commute.ts` (or move to `mobile/src/store/commute.ts` with imports updated), `mobile/src/commute.test.ts`, new `mobile/src/flags.ts`, `mobile/src/engine/effective.ts` + test, `mobile/src/engine/days.ts` + test, `mobile/src/reminders/schedule.ts` + test, `mobile/src/reminders/useReminders.ts`, `mobile/src/reminders/notifications.ts`, `mobile/src/app/setup.tsx`, `mobile/src/setup/Rows.tsx`, `mobile/src/app/index.tsx` (use effective commute), `mobile/src/today/useRoutes.ts` if its input changes, `mobile/app.json` (`extra.flags`), `design/DESIGN.md` (setup rows).

**Acceptance criteria**

- [ ] `Commute` in `contract.ts` matches SPEC.md "v2 amendments" exactly. `withDefaults` reads a v1 object (no `version`) into v2: `quietWeekends: true`, no `arriveByByDay`, no `returnTrip`, `contacts: [{ ...contact, tone, language }]` with tone and language taken from the voice stored for that contact today if any, else manager/en. `contact` stays equal to `contacts[0]` on every save.
- [ ] A corrupt or partial stored value still opens the app on the seed commute, as today.
- [ ] `flags.ts`: `flag(name)` reads `app.json` `extra.flags` defaults (D7) with `fika.flags` overrides; typed names.
- [ ] `effectiveCommute(commute, { date, direction: 'work' })` returns the commute with that weekday's arrive-by when set; direction `home` is typed but may throw "not yet" until ticket 08. The Today screen fetches and evaluates the effective commute; Demo mode's saved commute bypasses it.
- [ ] `commuteDays(commute, from, count)` returns the next `count` commute days on or after `from` in Africa/Nairobi, skipping Saturday and Sunday when `quietWeekends`. Holidays are filtered by part B of this ticket.
- [ ] Morning reminders: the repeating daily trigger is gone; on every app open and when the usual departure changes, Fika cancels its own pending morning reminders (identified by an identifier prefix) and schedules one-off ones for the next seven commute days at usual departure − `DAILY_LEAD_MIN`, skipping any already in the past. The one-off "Remind me at" reminder is untouched.
- [ ] Setup: a "Quiet on weekends" switch row, and a "Different time on some days" row that opens a sheet listing Mon–Sun with an arrive-by per day (blank means the usual). Saved with the rest; the footnote stays last.
- [ ] Existing setup validation and save behaviour unchanged for the fields that exist today.

**Testing:** Test-first: `withDefaults` for v1, v2, partial and garbage input; round trip save/load keeps every v2 field; `contact` mirrors `contacts[0]`. `effectiveCommute` per weekday. `commuteDays` across a weekend, with quiet off, across a month end, and the Nairobi day boundary. Scheduling: given a mocked `expo-notifications`, reschedule cancels only Fika morning identifiers and schedules seven. Full suite and typecheck.

**Device check (coordinator, D14):** Setup: turn quiet weekends off and on, set Friday to 8:30, save; Today shows the right deadline on a Friday demo clock is not needed. Coordinator checks setup rows render and save, and that the app still opens with the previous stored commute.

## Part B — Kenyan public holidays (W6)

Morning reminders skip Kenyan public holidays, and on a holiday the Today hero says so instead of a leave-by.

**Files:** new `mobile/src/engine/holidays.ts` + test, `mobile/src/engine/days.ts` (use it) + test, `mobile/src/today/Hero.tsx` or `words.ts` (holiday line), `design/DESIGN.md` (behaviour entry).

**Acceptance criteria**

- [ ] `holidays.ts` holds the gazetted Kenyan public holidays for 2026 and 2027 as `YYYY-MM-DD` with names, including fixed-date ones (1 Jan, 1 May, 1 Jun, 10 Oct, 20 Oct, 12 Dec, 25 Dec, 26 Dec), Good Friday and Easter Monday for both years, and Idd ul-Fitr as announced; a comment says the list must be checked against each year's Kenya Gazette notice and moved-to-Monday rules. The coordinator's dispatch supplies the verified dates.
- [ ] `isPublicHoliday(date)` works on the Africa/Nairobi calendar day and returns the holiday name or null.
- [ ] `commuteDays` skips holidays regardless of `quietWeekends`.
- [ ] On a holiday (live, not Demo mode), the hero keeps its numbers but the decision line is replaced by "Public holiday: <name>. No reminder today."
- [ ] Demo mode ignores holidays.

**Testing:** Test-first: `isPublicHoliday` on a holiday, the day before, a Nairobi-midnight boundary; `commuteDays` over the Christmas week. Full suite and typecheck.

**Device check (coordinator, D14):** None on device beyond a Today screenshot (no holiday today); unit tests carry this ticket.

## Part C — Morning reminder with today's numbers (W12)

Behind `flag('backgroundReminder')`, an opportunistic background task refreshes today's morning reminder with real numbers: "Leave by 7:45 today, Kiambu Road is slow." When the OS doesn't run it, the reminder is the plain one.

**Files:** new `mobile/src/reminders/background.ts` + test, `mobile/src/reminders/schedule.ts`, `mobile/src/reminders/useReminders.ts`, `mobile/src/app/_layout.tsx` (task registration at module scope), `mobile/app.json` (background modes / plugin as `expo-background-task` requires), `mobile/src/today/words.ts` (reminder body).

**Acceptance criteria**

- [ ] A task is defined with `expo-task-manager`/`expo-background-task` at module scope and registered with the minimum interval when the flag is on; unregistered when off.
- [ ] When it runs within the 90 minutes before today's morning reminder on a commute day, it fetches routes for the effective commute (the same API client and shared key the app uses), evaluates with the engine, and replaces today's pending morning reminder with one at the same time whose body is `morningBody(evaluation)`. Any failure leaves the existing reminder untouched.
- [ ] `morningBody(evaluation)` is pure: on time "Leave by 7:45 today via Limuru Road.", at risk "Leave now: traffic on Kiambu Road.", late "You're likely late today. Fika has a message ready."
- [ ] Outside the window, on a non-commute day, or with the flag off, the task does nothing and returns success.
- [ ] SPEC.md's amendment wording holds: no polling loop, the OS decides when it runs.

**Testing:** Test-first: `morningBody` for each state; the task body as a pure async function with injected fetch, clock and scheduler: inside window replaces, outside window no-ops, fetch failure no-ops. Full suite and typecheck.

**Device check (coordinator, D14):** Coordinator triggers the task via the dev-client debug path if available; otherwise verify registration logs and rely on unit tests. Report which.

## Comments
