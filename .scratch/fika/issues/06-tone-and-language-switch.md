# 06 — Tone and language switch

**What to build:** The commuter can make the notice fit the recipient: manager or friend tone, in English, Swahili or Sheng. Switching redrafts the notice. The ETA and lateness never change between variants.

**Blocked by:** 05 — Claude writes the words

**Status:** ready-for-agent

- [ ] Tone (manager, friend) and language (English, Swahili, Sheng) controls in the notice view
- [ ] Switching either redrafts the notice; user edits are not silently overwritten without the user asking for a redraft
- [ ] Every variant still passes the exact-ETA guard; the template fallback exists for each language
- [ ] Defaults come from the saved contact's relationship
- [ ] Sheng output reviewed by a Sheng speaker on the team; if it reads badly, move this call to a larger model
- [ ] Controls match the design and show the current selection

**Technical notes:** Uses the `tone` and `language` fields of `DraftRequest`; add Swahili and Sheng templates to the fallback. Cache drafts per tone and language so flipping back is instant. Shapes and stack: see "Technical Contract" in the spec.

**Design:** Late notice sheet: Manager / Friend segmented switch and English / Swahili / Sheng chips. Follow `design/DESIGN.md` (tokens, screen list, behaviour) and the mock-ups in `design/screens/`; live canvas: https://claude.ai/artifact/ACWoARzcKHbdC6Zz7UAY15. The mock-ups are HTML for reference only: build with React Native views and styles.

**Testing:** Test-first (red, green, refactor): write one failing test for one behaviour, make it pass, repeat. Test through the public interface only. Seam: the draft endpoint. Tests first for: tone and language reach the prompt input, and the template fallback for each language contains the exact ETA and rounded lateness. Sheng quality is reviewed by a person.

**Commits:** Land this ticket as 2 to 5 small commits on the current branch, not one big one. Each commit is one coherent step, leaves the tests passing, and keeps a test together with the code that makes it pass. Imperative subject line ending with `(refs #8)`. Do not use "closes" or "fixes" in a commit message: the ticket is closed by hand after the handoff notes are posted. Fixes from the code review go in their own commit. Suggested split: Swahili and Sheng fallback templates with tests · tone and language reach the draft request with tests · tone switch and language chips in the sheet.

**Review:** Once the acceptance criteria are met and the tests pass, run `/code-review` on this ticket's changes, before writing the handoff notes. Fix every confirmed finding and re-run the tests. Anything you decide not to fix goes in the handoff notes with the reason. Keep the review to this ticket's changes; do not refactor other tickets' work.

**Handoff notes:**

- Before starting: read the spec and the "Handoff notes" comment on every ticket listed under "Blocked by". Trust those notes over the spec where they differ; they describe what was actually built.
- When done, before closing: post one comment titled "Handoff notes" on this ticket with:
  - What was built, in a few lines, and how to run and test it
  - Decisions made and anything that deviates from the spec or this ticket, with the reason
  - Names of the interfaces the next tickets will touch (endpoints, engine inputs and outputs, stored settings), as they actually are
  - Gotchas, known gaps, and anything left unfinished
  - What each ticket blocked by this one should know before it starts
