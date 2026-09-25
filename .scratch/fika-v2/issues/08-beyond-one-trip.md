# 08 — Beyond one trip: return, calendar, ride-hail

**Items:** W5, W7, W10 · **Architecture:** `PLAN.md` → Engine additions; Phase G · **Decisions:** D12, D5

**Blocked by:** 06

**Status:** ready-for-agent

**Reviewer:** at coordinator discretion

Parts are built in order, each test-first where its Testing line says so. The ticket is accepted only when every part's criteria hold.

Files not listed under a part are read-only. `SPEC.md`, `PLAN.md` and other tickets are never edited by the implementer.

## Part A — Return trip (W5)

With a "Be home by" time in setup, the Today screen can flip to the trip home: origin and destination swap and the deadline is the home-by time. A swap control sits beside the summary line.

**Files:** `mobile/src/engine/effective.ts` (implement `home`) + test, `mobile/src/app/setup.tsx` ("Be home by" optional time row), `mobile/src/today/Hero.tsx` (swap control on the summary line), `mobile/src/app/index.tsx` (direction state), `design/DESIGN.md` (entry).

**Acceptance criteria**

- [ ] `effectiveCommute(commute, { date, direction: 'home' })` swaps origin and destination, uses `returnTrip.homeBy` as arrive-by, and uses a usual departure of home-by minus the last known trip duration, or `homeBy − 60 min` when unknown; throws a typed error if `returnTrip` is absent.
- [ ] Setup: optional "Be home by" time row; clearing it removes `returnTrip`.
- [ ] Today: when `returnTrip` exists, a small round swap control beside the summary line toggles direction; the summary reads "Upper Hill to Ruaka · home by 18:30". Default direction is home after 12:00 Nairobi time, else work. Direction is not persisted.
- [ ] Flipping direction refetches routes for the flipped pair and resets the selected route.
- [ ] Morning reminders are unaffected. The notice still goes to the same contacts.
- [ ] Demo mode hides the swap control.

**Testing:** Test-first on `effectiveCommute` home: swapped places, deadline, fallback departure, error without return trip. Full suite and typecheck.

**Device check (coordinator, D14):** Setup: set Be home by 18:30, save. Today: swap, routes reload for the reverse pair; swap back.

## Part B — Arrive by your first meeting (W7)

If the commuter turns it on, Fika reads today's first timed calendar event before noon and offers "Arrive by 8:30 for Standup?" on the Today screen. Accepting overrides today's arrive-by only. Read-only.

**Files:** new `mobile/src/calendar/firstEvent.ts` + test, `mobile/src/engine/effective.ts` (override) + test, `mobile/src/app/setup.tsx` ("Use my calendar" switch), `mobile/src/app/index.tsx` and `mobile/src/today/Hero.tsx` (suggestion chip), `mobile/app.json` (`expo-calendar` plugin with calendar permission text), `design/DESIGN.md` (entry).

**Acceptance criteria**

- [ ] Permission is asked only when the commuter turns "Use my calendar" on in setup; denied leaves the switch off with a one-line note. Hidden when `flag('calendar')` is off.
- [ ] `firstEventBefore(events, day, noon)` is pure: earliest non-all-day event starting today before 12:00 Nairobi time whose start is after now; returns `{ title, start }` or null.
- [ ] When one exists and its start differs from the effective arrive-by, a chip under the hero reads "Arrive by 8:30 for Standup?" with Accept and a dismiss ✕ (stroke icon). Accept stores `{ date, arriveBy }` under `fika.today`; `effectiveCommute` applies it for that date only. Dismiss hides it for the day.
- [ ] Event titles are truncated to 24 characters; nothing from the calendar is sent to the backend or Claude.
- [ ] Demo mode never shows the chip.

**Testing:** Test-first: `firstEventBefore` (all-day skipped, past skipped, after noon skipped, earliest wins); `effectiveCommute` with and without an override for today and for yesterday. Full suite and typecheck.

**Device check (coordinator, D14):** Coordinator adds a simulator calendar event for tomorrow-morning-equivalent is optional; minimum: turn the switch on, grant permission, confirm no crash and the chip logic via unit tests.

## Part C — Open in Uber for ride-hail (W10)

For a ride-hail commute, the footer link opens Uber with the destination set, instead of Google Maps.

**Files:** `mobile/src/today/directions.ts` + test, `mobile/src/today/ActionArea.tsx`.

**Acceptance criteria**

- [ ] `uberUrl(destination: Place)` returns `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=…&dropoff[longitude]=…&dropoff[nickname]=…` with values URL-encoded (D12).
- [ ] When `commute.mode === 'ride_hail'` the footer link reads "Open in Uber" and opens that URL; drive keeps "Open in Google Maps".
- [ ] If the URL cannot be opened, the existing fallback behaviour of the link applies.

**Testing:** Test-first on `uberUrl` (encoding of a label with spaces and an apostrophe). Full suite and typecheck.

**Device check (coordinator, D14):** Setup: switch to Ride-hail, save; footer shows Open in Uber; tap opens Safari to m.uber.com.

## Comments
