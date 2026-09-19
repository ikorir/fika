# 03 — Demo mode

**What to build:** A presenter can show the whole arc in minutes without waiting for real traffic. A Demo mode toggle exposes two presets ("Accident on Route A, +25 min" and "Advance clock to mid-trip"), a clock control and a one-tap reset. Simulated delays are applied on top of the real route response, inside the commute engine, before any other calculation. Whenever any simulation is active a persistent "SIMULATED TRAFFIC" banner is on screen.

**Blocked by:** 02 — Leave-by time and the three states

**Status:** ready-for-agent

- [ ] Engine accepts an optional simulation (delay on a named route and/or an advanced clock) and reports whether any simulation is active
- [ ] The banner is driven only by that engine flag and cannot be hidden while a simulation is active
- [ ] Accident preset moves the seeded commute from on time to at risk and recommends the other route
- [ ] Mid-trip preset moves it to late, projecting the remaining trip from the advanced clock
- [ ] Engine tests cover on time → at risk → late using the two presets
- [ ] Reset returns to the starting state in one tap
- [ ] With Demo mode off, no simulated value can reach the screen
- [ ] Sheet matches the design: two scenarios, app clock with back/forward 5-minute steps, Reset to start
- [ ] Banner says what is simulated ("SIMULATED TRAFFIC · WAIYAKI WAY +25 MIN", "SIMULATED TRAFFIC · CLOCK SET TO 8:40")
- [ ] Demo mode icon in the header turns accent orange while Demo mode is on

**Technical notes:** Implement the `Simulation` input of `evaluate()` (`delay`, `clock`, `midTrip`) and the `simulated` / `simulationLabel` outputs. Demo state lives in app memory only and is never persisted. Shapes and stack: see "Technical Contract" in the spec.

**Design:** Demo mode sheet; the white banner under the map in Today · at risk and Today · late. Follow `design/DESIGN.md` (tokens, screen list, behaviour) and the mock-ups in `design/screens/`; live canvas: https://claude.ai/artifact/ACWoARzcKHbdC6Zz7UAY15. The mock-ups are HTML for reference only: build with React Native views and styles.

**Testing:** Test-first (red, green, refactor): write one failing test for one behaviour, make it pass, repeat. Test through the public interface only. Seam: `evaluate()` with a `Simulation`. Tests first for each preset moving the seeded samples on time → at risk → late, and for the `simulated` flag. The sheet and banner are checked by hand.

**Commits:** Land this ticket as 2 to 5 small commits on the current branch, not one big one. Each commit is one coherent step, leaves the tests passing, and keeps a test together with the code that makes it pass. Imperative subject line ending with `(refs #5)`. Do not use "closes" or "fixes" in a commit message: the ticket is closed by hand after the handoff notes are posted. Fixes from the code review go in their own commit. Suggested split: engine: delay simulation with tests · engine: clock and mid-trip simulation with tests · Demo mode sheet and presets · banner and header indicator.

**Review:** Once the acceptance criteria are met and the tests pass, run `/code-review` on this ticket's changes, before writing the handoff notes. Fix every confirmed finding and re-run the tests. Anything you decide not to fix goes in the handoff notes with the reason. Keep the review to this ticket's changes; do not refactor other tickets' work.

**Handoff notes:**

- Before starting: read the spec and the "Handoff notes" comment on every ticket listed under "Blocked by". Trust those notes over the spec where they differ; they describe what was actually built.
- When done, before closing: post one comment titled "Handoff notes" on this ticket with:
  - What was built, in a few lines, and how to run and test it
  - Decisions made and anything that deviates from the spec or this ticket, with the reason
  - Names of the interfaces the next tickets will touch (endpoints, engine inputs and outputs, stored settings), as they actually are
  - Gotchas, known gaps, and anything left unfinished
  - What each ticket blocked by this one should know before it starts
