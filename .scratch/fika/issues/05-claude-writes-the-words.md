# 05 — Claude writes the words

**What to build:** The decision line, the conditions note and the late notice are written by Claude and read naturally, while every number stays exactly what the engine computed. A draft endpoint takes facts already computed by the engine (state, deadline, leave-by and ETA as display strings, rounded lateness, per-route traffic delays, recipient name and relationship, tone, language) and makes one Claude call (Haiku 4.5) returning JSON with `decision_line`, `conditions_note` and `notice`. If anything goes wrong the user still gets a correct message.

**Blocked by:** 02 — Leave-by time and the three states; 04 — Late notice, template version

**Status:** ready-for-agent

- [ ] Endpoint returns the three fields; Claude is instructed never to compute or change numbers
- [ ] Response is schema-validated, and the notice must contain the exact ETA string that was passed in
- [ ] On timeout, invalid JSON or a missing ETA, the endpoint returns the deterministic template in the requested language
- [ ] Tests with a faked Claude client cover: valid pass-through, invalid JSON, timeout, notice missing the ETA
- [ ] App shows the decision line and conditions note ("Waiyaki Way is 18 min slower than normal; Ngong Rd is unaffected") on the main screen and the Claude notice in the notice view
- [ ] App falls back to its own English template when the endpoint cannot be reached
- [ ] Response is fast enough to feel instant on stage; a loading state covers the wait
- [ ] Claude mentions a cause (such as an accident) only when one is passed in as a fact, which happens only for a simulated accident; with live data it never invents a cause

**Technical notes:** `POST /api/draft` with `DraftRequest` / `DraftResponse` from the Technical Contract. Model `claude-haiku-4-5-20251001`, short timeout, zod validation, exact-ETA check, `source` tells the app which path answered. Read the current Anthropic SDK docs for JSON output before writing the call. Tests with vitest and a faked client. Shapes and stack: see "Technical Contract" in the spec.

**Design:** Decision line and conditions note on all three Today screens; message text in Today · late and the Late notice sheet. Follow `design/DESIGN.md` (tokens, screen list, behaviour) and the mock-ups in `design/screens/`; live canvas: https://claude.ai/artifact/ACWoARzcKHbdC6Zz7UAY15. The mock-ups are HTML for reference only: build with React Native views and styles.

**Testing:** Test-first (red, green, refactor): write one failing test for one behaviour, make it pass, repeat. Test through the public interface only. Seam: the draft endpoint with a faked Claude client. Tests first for: valid pass-through, invalid JSON, timeout, notice missing the exact ETA, no invented cause in the request when none is given. Wording quality is judged by reading real outputs, not by tests.

**Commits:** Land this ticket as 2 to 5 small commits on the current branch, not one big one. Each commit is one coherent step, leaves the tests passing, and keeps a test together with the code that makes it pass. Imperative subject line ending with `(refs #7)`. Do not use "closes" or "fixes" in a commit message: the ticket is closed by hand after the handoff notes are posted. Fixes from the code review go in their own commit. Suggested split: draft endpoint contract, validation and template fallback with tests · Claude call and prompt · app shows decision line, conditions note and notice with offline fallback.

**Review:** Once the acceptance criteria are met and the tests pass, run `/code-review` on this ticket's changes, before writing the handoff notes. Fix every confirmed finding and re-run the tests. Anything you decide not to fix goes in the handoff notes with the reason. Keep the review to this ticket's changes; do not refactor other tickets' work.

**Handoff notes:**

- Before starting: read the spec and the "Handoff notes" comment on every ticket listed under "Blocked by". Trust those notes over the spec where they differ; they describe what was actually built.
- When done, before closing: post one comment titled "Handoff notes" on this ticket with:
  - What was built, in a few lines, and how to run and test it
  - Decisions made and anything that deviates from the spec or this ticket, with the reason
  - Names of the interfaces the next tickets will touch (endpoints, engine inputs and outputs, stored settings), as they actually are
  - Gotchas, known gaps, and anything left unfinished
  - What each ticket blocked by this one should know before it starts
