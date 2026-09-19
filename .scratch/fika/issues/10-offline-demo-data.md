# 10 — Offline demo data

**What to build:** The full stage arc survives venue wifi, Google or Claude failing. Demo mode can run from a bundled saved real routes response plus pre-generated wording for every step of the five-minute script, including the tone and language flip. In airplane mode the presenter can still go from on time to at risk to late to a prefilled notice.

**Blocked by:** 03 — Demo mode; 06 — Tone and language switch

**Status:** ready-for-agent

- [ ] A saved real routes response for the presenter's commute is bundled with the app
- [ ] Pre-generated decision line, conditions note and notice exist for each preset and each tone/language shown in the script
- [ ] With the network off, Demo mode runs the whole arc with no spinner that never ends and no error
- [ ] With the network on, live data is still used outside Demo mode
- [ ] The bundled response is an engine test case, so the stage arc is checked by the test suite
- [ ] The "SIMULATED TRAFFIC" banner is shown throughout
- [ ] The switch in the Demo mode sheet turns the bundled data on and off

**Technical notes:** Bundle one `RoutesResponse` JSON and a map of pre-generated `DraftResponse` objects keyed by scenario, tone and language. "Use saved routes" swaps the data source; `evaluate()` is untouched. Shapes and stack: see "Technical Contract" in the spec.

**Design:** Demo mode sheet: "Use saved routes — works with no internet" switch. Follow `design/DESIGN.md` (tokens, screen list, behaviour) and the mock-ups in `design/screens/`; live canvas: https://claude.ai/artifact/ACWoARzcKHbdC6Zz7UAY15. The mock-ups are HTML for reference only: build with React Native views and styles.

**Testing:** Test-first (red, green, refactor): write one failing test for one behaviour, make it pass, repeat. Test through the public interface only. Seam: `evaluate()` fed the bundled `RoutesResponse`. Tests first: the fixture produces on time, then at risk with the accident preset, then late with the mid-trip preset, and every scripted scenario/tone/language key has a saved draft. The airplane-mode run is checked by hand.

**Commits:** Land this ticket as 2 to 5 small commits on the current branch, not one big one. Each commit is one coherent step, leaves the tests passing, and keeps a test together with the code that makes it pass. Imperative subject line ending with `(refs #12)`. Do not use "closes" or "fixes" in a commit message: the ticket is closed by hand after the handoff notes are posted. Fixes from the code review go in their own commit. Suggested split: bundled routes response with engine tests over it · saved drafts for every scripted step with the coverage test · "Use saved routes" switch and offline data source.

**Review:** Once the acceptance criteria are met and the tests pass, run `/code-review` on this ticket's changes, before writing the handoff notes. Fix every confirmed finding and re-run the tests. Anything you decide not to fix goes in the handoff notes with the reason. Keep the review to this ticket's changes; do not refactor other tickets' work.

**Handoff notes:**

- Before starting: read the spec and the "Handoff notes" comment on every ticket listed under "Blocked by". Trust those notes over the spec where they differ; they describe what was actually built.
- When done, before closing: post one comment titled "Handoff notes" on this ticket with:
  - What was built, in a few lines, and how to run and test it
  - Decisions made and anything that deviates from the spec or this ticket, with the reason
  - Names of the interfaces the next tickets will touch (endpoints, engine inputs and outputs, stored settings), as they actually are
  - Gotchas, known gaps, and anything left unfinished
  - What each ticket blocked by this one should know before it starts
