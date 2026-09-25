# Ticket 06, attempt 1: commute v2 and smarter mornings

Result: all three parts are built in order (A, then B, then C), and every acceptance criterion has a Jest test at the
seam the ticket names. Nothing is committed or staged.

## Checks (2026-09-25, in `mobile/`)

| Check | Result |
| --- | --- |
| `npm test` | **52 suites, 507 of 507 pass**. Before: 44 suites, 413 tests. One old test was removed with the function it tested (`dailyTrigger`, see Decisions), so 412 of the original 413 are still there. 95 tests are new. No console, act or LogBox warnings in the output. |
| `npm run typecheck` | `tsc --noEmit` clean, exit 0 |
| React Compiler (babel with `babel-plugin-react-compiler`, **not** `expo lint`) | `TodayScreen`, `SetupScreen`, `DaysSheet`, every row in `Rows.tsx` (`SwitchRow` included), `Hero`/`Facts`, all four reminder hooks and `RootLayout` compile with no bail-outs. `useRoutes` bails out on its `try/finally`, and so does the HEAD version, so this ticket did not cause it. |
| `npx expo install expo-task-manager` | Added `"expo-task-manager": "~57.0.20"` to `package.json`, plus one line in `package-lock.json`. That version was already installed and linked through `expo-background-task` (`ExpoTaskManager 57.0.20` is in `ios/Podfile.lock`). |

Tests came first. Before any implementation, the new suites failed: 24 red across flags, reminders, setup, Today, Hero
and words, and the engine, commute, holidays and effective tests could not find their modules. The module-scope task
test went red when I commented out the `defineMorningReminderTask()` call in `_layout.tsx`. Two `useRoutes` race tests
were red against the old in-flight join (see Decisions).

Test counts in the touched suites: `commute` 27, `engine/effective` 14, `engine/days` 7, `engine/holidays` 5, `flags`
4, `reminders/schedule` 13, `reminders/notifications` 5, `reminders/background` 15, `reminders/useReminders` 8,
`setup/SetupScreen` 10, `today/TodayScreen` 13, `today/Hero` 22, `today/words` 4, `today/useRoutes` 3,
`RootLayout` 6.

## Files

- **A:**
  - `contract.ts`: `Commute` v2, `Contact` and `Weekday`, exactly as in SPEC "v2 amendments".
  - `commute.ts`: `withDefaults` migration, `loadCommute` and `saveCommute`. I did not move it into `store/`.
  - `commute.test.ts`
  - New: `flags.ts` and `flags.test.ts`; `engine/effective.ts`, `engine/days.ts` and their tests.
  - `reminders/schedule.ts`, `notifications.ts` and `useReminders.ts`, with their tests. `notifications.test.ts` is new.
  - `app/setup.tsx`, `setup/Rows.tsx` (`SwitchRow`, plus calendar and moon icons), and new `setup/DaysSheet.tsx`.
  - `app/index.tsx` and `today/useRoutes.ts` (`routesRequest` extracted, plus a race fix), with new
    `today/useRoutes.test.ts`.
  - `app.json` (`extra.flags` and the `expo-background-task` plugin), and `design/DESIGN.md`.
- **B:** new `engine/holidays.ts` and its test; `engine/days.ts` uses it; `today/Hero.tsx` and `today/words.ts`
  (`holidayLine`); `Hero.test.tsx`; `DESIGN.md`.
- **C:** new `reminders/background.ts` and its test; `today/words.ts` (`morningBody`) and new `words.test.ts`;
  `app/_layout.tsx`; `RootLayout.test.tsx` (the task test and a notifications mock); `app.json`; and `package.json` and
  `package-lock.json` (`expo-task-manager`).
- **Forced by the v2 type, outside the file list:**
  - `seed.ts` gains `version`, `quietWeekends` and `contacts`.
  - Three test fixtures typed `: Commute` gain the same three fields: `engine.test.ts`, `draft/request.test.ts` and
    `notice/template.test.ts`. Their assertions are unchanged.

## How it works

- **v2 read (`withDefaults`).**
  - A value with no `version` reads as v2:
    - `version: 2` and `quietWeekends: true`.
    - No `arriveByByDay` and no `returnTrip`; the keys are absent, not `undefined`.
    - `contacts: [{ ...contact, tone, language }]`.
  - Every v1 field is validated exactly as before, so a v1 value loses nothing, on read or on the next save. The test
    uses a Greatwall Apartments → DTB Centre v1 value.
  - A v2 value keeps every field it can read.
  - `arriveByByDay` keeps only valid `HH:mm` per weekday key, and an empty map is dropped.
  - `contacts` is capped at two.
  - **`contact` wins over `contacts[0]`** for name, phone and relationship. Setup edits `contact`, and pre-v2 builds
    only know `contact`. `contacts[0]` keeps its own tone and language. Both leave `withDefaults` identical, so
    `saveCommute` always stores `contact` equal to `contacts[0]` (minus tone and language).
- **Corrupt values.** Unparseable JSON, or JSON that is not an object (`null`, `42`, `"x"`, `[]`), opens on the seed.
  A partial object is filled with defaults, as before.
- **Flags.** `flag(name)` is async. It reads the `fika.flags` override `{version:1, flags:{…}}`, and falls back to
  `Constants.expoConfig.extra.flags`. A flag missing from app.json is off. `setFlag(name, bool|null)` writes an
  override, so a flag can be switched off before the demo without a rebuild.
- **Effective commute (D5).**
  - `effectiveCommute(c, {date, direction:'work'})` returns **the same object** on a day with no arrive-by of its own.
    On a day with one, it returns `{...c, arriveBy}`.
  - `direction: 'home'` throws `…not yet built (ticket 08)`.
  - `commuteDayAt(c, now)` picks the day the Today screen is about: today, until two hours past today's effective
    deadline, then tomorrow.
  - `index.tsx` memoises the effective commute on `[own, dayMs]`, so it changes only when the day does. A test checks
    that it does not refetch on clock ticks.
  - With Demo mode's saved routes on, the screen shows `savedCommute` and skips the effective commute.
- **Commute days.** `commuteDays(c, from, count)` returns each day as its Nairobi midnight, skipping Saturday and
  Sunday while `quietWeekends` is on, and skipping holidays always.
- **Morning reminders (D6).** `rescheduleMorningReminders` works in this order:
  1. Lists the pending notifications.
  2. Cancels those whose identifier starts with `fika.morning.`, and also the legacy `fika.daily-reminder`.
  3. Schedules a one-off `DATE` trigger for each of the next 7 commute days at usual departure − 15 min, skipping any
     whose time has passed.

  Reschedules run one at a time. `useDailyReminder(commute)` runs it:
  - on mount;
  - on every return to the foreground (`AppState` active);
  - when `usualDeparture` or `quietWeekends` changes;

  and only while notifications are allowed. The one-off "Remind me at" (OS identifiers) and `showReminderNow` are
  untouched.
- **Holidays.** `isPublicHoliday(date)` returns the name for the Nairobi calendar day, or null. The table is the
  coordinator's verified 2026–27 list. The 2027 Idd dates are left out, as the comment says. On a holiday, the Today
  screen passes `holiday` to `Hero` (the screen's day, and only while Demo mode is off). `Hero` replaces the decision
  line, Claude's or the template's, with "Public holiday: <name>. No reminder today." The numbers and the note stay.
- **Background task (W12).**
  - `refreshMorningReminder(deps)` is the pure body. Its inputs are injected: `enabled`, `commute`, `now`,
    `fetchRoutes` and `scheduler`. It works in this order:
    1. Flag off: skipped, and nothing is read.
    2. Takes the next morning reminder (it is on a commute day by construction). Skipped if there is none, or if it is
       more than 90 min away.
    3. Skipped if that identifier is not pending, so no billed fetch happens with nothing to rewrite.
    4. Otherwise it gets the effective commute for that day, fetches `routesRequest` (the Today screen's request)
       through the app's `fetchRoutes`, runs `evaluate`, and calls `replace` with `morningBody`.
    5. `replace` re-schedules the **same identifier and time**, with no cancel first. Any throw returns `'failed'`, and
       the pending reminder is left as it was.
  - `defineMorningReminderTask()` is called at module scope in `_layout.tsx`. It maps a failure to
    `BackgroundTaskResult.Failed` and anything else to `Success`.
  - `syncMorningReminderTask()` runs on mount and on every return to the foreground. Flag on: registers with
    `minimumInterval: 15`. Flag off: unregisters. Where `getStatusAsync()` is not `Available`, as on the iOS simulator,
    it does not register and logs quietly in dev. The library's own `console.warn` would otherwise put a LogBox toast
    over Today.
- **`useRoutes` race fix.** The effective commute can now change while the app runs, for example when the day turns or
  when the app wakes across the turn. The old in-flight join then made the new commute wait on the old commute's fetch
  and show its answer. The join is now per commute, and a stale response, error or `loading=false` is dropped.
  Behaviour with an unchanged commute is the same.

## Storage keys and notification identifiers

- AsyncStorage:
  - `fika.commute`: read and written, now v2.
  - `fika.flags`: read by `flag()`, written only by `setFlag()`.
  - Unchanged: `fika.last-routes`, still keyed by the effective `arriveBy`, and `fika.welcomed`.
- Notifications:
  - `fika.morning.<YYYY-MM-DD>` (prefix `fika.morning.`): listed, cancelled, scheduled and replaced. Data
    `{reminder:'morning', day}`.
  - `fika.daily-reminder`: cancelled only (legacy).
  - One-off reminders keep OS-generated identifiers and are never touched.
- Background task name: `fika.morning-reminder`. iOS BGTask identifier `com.expo.modules.backgroundtask.processing`
  (added by the plugin).

## Decisions and risks

1. **v1 tone.** No voice is stored for a contact today. I use the voice the notice gives that contact today:
   `defaultTone(relationship)` and `en`. That is `manager/en` for every relationship except friend-like ones, so a v1
   "friend" keeps the friend tone. **Decision:** accept, or force `manager` for everyone.
2. **One old test removed.** The repeating trigger is gone, so `dailyTrigger` and its one test were removed.
   `dailyReminderAt` and its tests stay. The existing "comes back the way it was saved" test now also expects
   `contacts[0]` to mirror the saved contact.
3. **Edits outside the file list:** `seed.ts`, three test fixtures, `setup/DaysSheet.tsx` (new, beside TimeSheet and
   PickerSheet), `RootLayout.test.tsx`, and the `useRoutes` race fix with its test. **Decision:** accept.
4. **Refreshed body is overwritten.** If the app is opened after the task rewrote today's body but before the reminder
   fires, the reschedule on open writes the plain body back. This is cancel-all then schedule-seven, as D6 says.
5. **Reminders run out.** If the app is not opened for seven commute days, no reminders are left (inherent in D6).
6. **Day-turn edge.** When tomorrow's arrive-by is later than today's, the screen shows tomorrow with *today's*
   arrive-by for up to the difference after today's deadline + 2 h. Otherwise it would show tomorrow's time as a
   deadline already passed today.
7. **Holiday line uses the screen's day.** After the evening turn before a holiday, the line already shows.
8. **`contacts[0].tone` does not follow relationship edits in setup.** That is for ticket 09.

## Handoff notes (for 07–09)

- `contact` wins over `contacts[0]` on read and save. A ticket that edits contacts should also update `contact`.
- `flag()` is async: use it in an effect.
- Implement `home` in `effectiveCommute`.
- `useDailyReminder` now takes `{usualDeparture, quietWeekends}`.

## Device checks (coordinator, D14)

Rebuild the dev client first, because app.json gains the `expo-background-task` plugin (Info.plist
`UIBackgroundModes` `processing` and `BGTaskSchedulerPermittedIdentifiers`): `cd mobile && npx expo run:ios`. Metro is
on 8082.

**A**
1. Launch on the phone that holds the stored v1 commute. Today opens on "Greatwall Apartments to DTB Centre · arrive by
   <its time>", exactly as before, with no LogBox toast.
2. Optional, if notifications are allowed: with `debugger-evaluate`, run
   `await globalThis.expo.modules.ExpoNotificationScheduler.getAllScheduledNotificationsAsync()`. Expect only
   `fika.morning.YYYY-MM-DD` identifiers, up to 7, weekdays only (no 2026-09-26 or 09-27), no `fika.daily-reminder`,
   and date triggers.
3. Edit commute. Every stored value is as before. Under the times card is a new card: "Different time on some days —
   None", then "Quiet on weekends" with the switch on. The footnote is still last.
4. Switch Quiet on weekends off, then on. Tap "Different time on some days". The sheet lists Monday to Sunday, each
   "Usual", under "A blank day uses your usual <time>."
5. Tap Friday. The sheet "Arrive by on Friday" opens at the usual time. Step to 8:30 (for a 9:00 usual: Hour back, then
   Minute forward ×6). Close: the week shows "Friday 8:30" with a ×. Close: the row reads "Fri 8:30". Save.
6. Today is Friday 2026-09-25. Before 10:30 Nairobi, the summary reads "arrive by 8:30" and routes refetch once.
7. Kill and relaunch. Setup still shows "Fri 8:30" and the same commute.
8. Restore: Setup → the × on Friday → Save. The row reads "None".

**B:** one Today screenshot. It is not a holiday today, so there is no holiday line and the decision line is as usual.

**C:** background tasks are not available on the iOS simulator (status Restricted). On launch, Metro logs
`Fika: fika.morning-reminder not registered (background tasks unavailable here)`, and no warning toast shows. On an
Android emulator the log reads `registered, minimum interval 15 min`, and in a debug build
`await globalThis.expo.modules.ExpoBackgroundTask.triggerTaskWorkerForTestingAsync()` runs the task. Otherwise the unit
tests carry this part. Report which was done.
