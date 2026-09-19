# 09 — Daily reminder and freshness

**What to build:** On Monday the app works without the commuter remembering it. A repeating daily local notification fires a fixed lead time before the usual departure ("Check today's commute"). Tapping it opens the app and fetches fresh data; so does bringing the app to the foreground. There is no background polling. The commuter can always see how old the data is, and a failed fetch never leaves a blank screen.

**Blocked by:** 02 — Leave-by time and the three states

**Status:** ready-for-agent

- [ ] Notification permission is requested with a clear reason; a daily local notification is scheduled and rescheduled when the usual departure time changes
- [ ] Tapping the notification opens Today's commute and refetches
- [ ] Bringing the app to the foreground refetches
- [ ] "Last updated" time is visible
- [ ] Fetch failure shows a clear message with the last known result still visible and a retry
- [ ] Works in Expo Go on iOS and Android
- [ ] In Demo mode the reminder can be triggered on cue from the clock control
- [ ] On-time primary action "Remind me at <leave-by − 10 min>" schedules a one-off local notification for today, separate from the daily one
- [ ] Header refresh button refetches on demand

**Technical notes:** `expo-notifications`: one repeating daily trigger before `usualDeparture`, plus a one-off trigger at `Evaluation.remindAt`. Refetch on `AppState` change to active and on notification response. Keep the last `RoutesResponse` in memory and AsyncStorage for the error state. Shapes and stack: see "Technical Contract" in the spec.

**Design:** Today · on time: "Remind me at 7:55" button, refresh button in the header, "Updated 7:40". Follow `design/DESIGN.md` (tokens, screen list, behaviour) and the mock-ups in `design/screens/`; live canvas: https://claude.ai/artifact/ACWoARzcKHbdC6Zz7UAY15. The mock-ups are HTML for reference only: build with React Native views and styles.

**Testing:** Test-first (red, green, refactor): write one failing test for one behaviour, make it pass, repeat. Test through the public interface only. Seam, small: the reminder time calculation (daily trigger from `usualDeparture`, one-off from `Evaluation.remindAt`, nothing scheduled in the past). Notifications, foreground refresh and the error state are checked by hand on a phone.

**Commits:** Land this ticket as 2 to 5 small commits on the current branch, not one big one. Each commit is one coherent step, leaves the tests passing, and keeps a test together with the code that makes it pass. Imperative subject line ending with `(refs #11)`. Do not use "closes" or "fixes" in a commit message: the ticket is closed by hand after the handoff notes are posted. Fixes from the code review go in their own commit. Suggested split: reminder time calculation with tests · daily and one-off notifications · refresh on foreground, notification tap and refresh button · last-updated label and error state.

**Review:** Once the acceptance criteria are met and the tests pass, run `/code-review` on this ticket's changes, before writing the handoff notes. Fix every confirmed finding and re-run the tests. Anything you decide not to fix goes in the handoff notes with the reason. Keep the review to this ticket's changes; do not refactor other tickets' work.

**Handoff notes:**

- Before starting: read the spec and the "Handoff notes" comment on every ticket listed under "Blocked by". Trust those notes over the spec where they differ; they describe what was actually built.
- When done, before closing: post one comment titled "Handoff notes" on this ticket with:
  - What was built, in a few lines, and how to run and test it
  - Decisions made and anything that deviates from the spec or this ticket, with the reason
  - Names of the interfaces the next tickets will touch (endpoints, engine inputs and outputs, stored settings), as they actually are
  - Gotchas, known gaps, and anything left unfinished
  - What each ticket blocked by this one should know before it starts
