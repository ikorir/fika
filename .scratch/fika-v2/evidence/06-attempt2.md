# Ticket 06, attempt 2 (repair): the four review findings

Result: findings 1, 2 and 4 are fixed, each test-first. **Finding 3 is blocked:** it cannot be fixed inside the files
I own (details and a proposal below). Finding 5 is left as asked. Nothing is committed or staged.

## Checks (2026-09-25, in `mobile/`)

| Check | Result |
| --- | --- |
| `npm test` | **53 suites, 517 of 517 pass** (attempt 1: 52 and 507). 11 tests are new. The `RootLayout` module-scope test was removed with the definition it covered: `RootLayout.test.tsx` and `_layout.tsx` are back to their HEAD contents. No warnings in the output. |
| `npm run typecheck` | clean, exit 0 |
| `npx expo export --platform ios`, into the scratchpad | bundles from the new entry (`index-….hbc`, 4.4 MB), and `fika.morning-reminder` is in the bundle |

Red first:
- `entry.test.ts`: 2 red (no `../index`, and `main` was still `expo-router/entry`).
- Background, notifications and useReminders: 6 red before the record and the kept body existed.

## Finding 1: one billed fetch a morning

- New key `fika.morning-refresh`, stored as `{version:1, date:"YYYY-MM-DD", body}`. `loadMorningRefresh` returns null
  for a missing or unreadable record; `saveMorningRefresh` writes it. Both are in `reminders/background.ts`.
- `RefreshDeps` gains `record: { read, write }`, so the body stays pure.
- The order of a run:
  1. After the window check, a record already dated for that commute day skips the run with no fetch.
  2. Otherwise it fetches and evaluates, then writes the record, then replaces the reminder.
- Failures:
  - A failed fetch or evaluation writes nothing, so a later run may retry.
  - A failed record write leaves the reminder untouched and returns `failed`.
  - A failed replace after the write means no second fetch; fix 4 restores the words when the app next opens.
- Tests:
  - A refresh at 6:30, then runs at 6:45, 7:00, 7:15 and 7:30 make no fetch.
  - A failed fetch is retried and succeeds.
  - Yesterday's record does not block today.
  - A write failure leaves the reminder untouched.
  - The record round-trips and a corrupt one reads as null.

## Finding 2: the task is defined at bundle entry

- New `mobile/index.ts` runs `defineMorningReminderTask()`, then `require('expo-router/entry')`. The router is
  required rather than imported, because imports are hoisted and the definition must come first.
- `package.json` `main` is now `"index.ts"`.
- The definition is removed from `_layout.tsx`.
- Registering and unregistering by flag stays where it was in attempt 1, in `useDailyReminder` on app open and on
  return to the foreground. `_layout.tsx` never registered.
- `src/entry.test.ts` checks that the task is defined before the router loads, and that `main` points at the entry.

## Finding 4: a refreshed body survives a reschedule

- `rescheduleMorningReminders(commute, now, refreshed)` gives a reminder the refreshed words when the record's date is
  that reminder's commute day. Only reminders still ahead are scheduled, so "today's, still in the future" holds.
- `useDailyReminder` reads the record before each reschedule.
- Tests:
  - With today's record, today's body is kept and the other six are plain.
  - A record for another morning leaves all seven plain.
  - The hook passes the record through.

## Finding 3: blocked

The requested rule was: pick tomorrow once today's effective deadline + 2 h has passed, then use tomorrow's arrive-by.
That gives Thursday 11:30 → Friday 10:00, as asked. But both `useRoutes` and the engine
(`engine.ts deadlineOf`: `commuteDeadline(commute.arriveBy, earliestSample)`) place `arriveBy` on a day with the same
rollover rule from `time.ts`. At Thursday 11:30, `commuteDeadline('10:00', …)` is **Thursday 10:00**, because
10:00 + 2 h is still ahead. So the request, and the engine, would put the deadline on Thursday 10:00, already passed,
and the screen would read "late" by about a day. That is worse than today.

In the window from Thursday 11:00 to 12:00, no (day, arrive-by) pair is consistent with that rule:
- Thursday + 9:00 rolls to Friday.
- Friday + 10:00 resolves to Thursday.

So `effective.ts` cannot fix this alone. The engine has to be told the day, and neither `engine.ts` nor `time.ts` is
mine. Attempt 1's fallback is still in place: for up to the gap between the two arrive-bys, it shows Friday with
Thursday's 9:00.

**Proposed next action (needs approval, and a SPEC engine-signature amendment first):**
1. `evaluate` takes an optional `day: "YYYY-MM-DD"`. When it is given, `deadlineOf` returns
   `nairobiTimeOnDay(commute.arriveBy, day)`, and without it the engine behaves as it does now.
2. `routesRequest(commute, now, day)` uses the same instant.
3. `index.tsx` and `background.ts` pass `commuteDayAt`'s day.
4. `effective.ts` drops the fallback.
5. Add the reviewer's test: Thursday 11:30, usual 9:00, Friday 10:00 → Friday at 10:00, with the request and the
   evaluation deadline both on Friday 10:00.

Files: `SPEC.md`, `engine.ts`, `engine.test.ts`, `useRoutes.ts`, `index.tsx`, `background.ts`, `effective.ts`.

The other option is to accept the fallback.

## Storage and identifiers added

`fika.morning-refresh` (read on every reschedule and every task run; written after a successful fetch). Nothing else
changed from attempt 1.

## Device checks (coordinator)

Rebuild and restart Metro on 8082 so the new `main` (`index.ts`) is used. The dev client asks Metro for the entry, and
Expo resolves `main` when it starts.

1. The app launches exactly as before. No LogBox toast, and Today is on the stored commute.
2. The Metro log on launch still shows `Fika: fika.morning-reminder not registered (background tasks unavailable
   here)` on the iOS simulator.
3. Optional, with `debugger-evaluate`:
   `await globalThis.expo.modules.ExpoNotificationScheduler.getAllScheduledNotificationsAsync()` still lists only
   `fika.morning.*` identifiers with the plain body. No record exists on the simulator, because the task cannot run
   there.
