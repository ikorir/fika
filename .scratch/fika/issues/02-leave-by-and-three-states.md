# 02 — Leave-by time and the three states

**What to build:** The commuter sees the latest time they can leave and still arrive inside their buffer, what happens if they leave at their usual time, which route is recommended, and whether today is on time, at risk or late. The routes endpoint samples about 6 departure times (stepping back from the deadline in 10–15 minute steps, including "now" and the usual departure time) because driving has no arrive-by. All decisions happen in one pure module in the app, the commute engine, with the clock passed in. The decision line comes from a fixed template for now.

**Blocked by:** 01 — Walking skeleton

**Status:** ready-for-agent

- [ ] Routes endpoint returns a list of samples, each with its departure time and routes; no decision logic in the backend; responses cached per commute for a few minutes
- [ ] Engine: arrival = departure + duration + extra minutes
- [ ] Engine: leave-by = latest sampled departure whose best-route arrival is at or before deadline − buffer; "none" when nothing qualifies
- [ ] Engine: usual-time projection, recommended route (earliest arrival, ties to smaller traffic delay), traffic delay per route (duration − static duration)
- [ ] Engine: state is on time when ETA ≤ deadline − buffer, at risk when between that and the deadline, late when past the deadline; boundaries tested exactly
- [ ] Engine: lateness for messaging rounds up to the nearest 5 minutes (1 → 5, 5 → 5, 16 → 20)
- [ ] Table-driven tests cover all of the above through the engine's public interface only
- [ ] Screen shows leave-by, the usual-time line, each route's gap against the deadline ("12 min early", "8 min late"), the recommended route, and distinct on-time / at-risk / late styling
- [ ] At-risk state says what to do ("leave now, or switch to Route B") and whether another route restores on time
- [ ] Past leave-by is called out plainly
- [ ] Hero follows the design per state: "Leave by 8:05 · in 25 min · arrive 8:50", "Leave Now · arrive 8:55 · 5 min inside your buffer", "Arriving 9:15 · 15 min late · via Waiyaki Way"
- [ ] Route difference is green when outside the buffer, amber when inside it, red when past the deadline; the recommended route carries the "Best" badge
- [ ] At-risk primary action is "Switch to <best route>" and selects that route

**Technical notes:** Extend `POST /api/routes` to about 6 samples (`now`, `usual`, `step`). Build `evaluate()` exactly as typed in the Technical Contract (`Evaluation`, `RouteView`); the screen renders an `Evaluation` only. Tests with `jest-expo`, table-driven, clock injected. Shapes and stack: see "Technical Contract" in the spec.

**Design:** Today · on time, Today · at risk, Today · late: status pill, hero time, decision line, conditions note, route list, one primary action per state. Follow `design/DESIGN.md` (tokens, screen list, behaviour) and the mock-ups in `design/screens/`; live canvas: https://claude.ai/artifact/ACWoARzcKHbdC6Zz7UAY15. The mock-ups are HTML for reference only: build with React Native views and styles.

**Testing:** Test-first (red, green, refactor): write one failing test for one behaviour, make it pass, repeat. Test through the public interface only. Seam: `evaluate()`. Start with the leave-by cases, then state boundaries, tie-break, rounding. The screen and the endpoint sampling are checked by hand.

**Commits:** Land this ticket as 2 to 5 small commits on the current branch, not one big one. Each commit is one coherent step, leaves the tests passing, and keeps a test together with the code that makes it pass. Imperative subject line ending with `(refs #4)`. Do not use "closes" or "fixes" in a commit message: the ticket is closed by hand after the handoff notes are posted. Fixes from the code review go in their own commit. Suggested split: endpoint samples several departure times · engine: arrival, leave-by and usual-time projection with tests · engine: state, recommended route and rounding with tests · Today screen renders the Evaluation in all three states.

**Review:** Once the acceptance criteria are met and the tests pass, run `/code-review` on this ticket's changes, before writing the handoff notes. Fix every confirmed finding and re-run the tests. Anything you decide not to fix goes in the handoff notes with the reason. Keep the review to this ticket's changes; do not refactor other tickets' work.

**Handoff notes:**

- Before starting: read the spec and the "Handoff notes" comment on every ticket listed under "Blocked by". Trust those notes over the spec where they differ; they describe what was actually built.
- When done, before closing: post one comment titled "Handoff notes" on this ticket with:
  - What was built, in a few lines, and how to run and test it
  - Decisions made and anything that deviates from the spec or this ticket, with the reason
  - Names of the interfaces the next tickets will touch (endpoints, engine inputs and outputs, stored settings), as they actually are
  - Gotchas, known gaps, and anything left unfinished
  - What each ticket blocked by this one should know before it starts
