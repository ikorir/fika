# 11 — Rain note (stretch)

**What to build:** When rain is forecast around the departure window, the conditions note says so ("Rain at 7:30, so leave 10 min earlier"). The forecast comes from Open-Meteo (free, no key) via the backend and is passed to the draft endpoint as a fact. First thing to cut if time is short.

**Blocked by:** 05 — Claude writes the words

**Status:** ready-for-agent

- [ ] Backend fetches the hourly rain forecast for the origin around the departure window
- [ ] A rain flag and time are passed to the draft endpoint; Claude mentions rain only when the flag is set
- [ ] A forecast failure is silent: the note simply omits rain
- [ ] The template fallback has a rain variant

**Technical notes:** Open-Meteo hourly precipitation probability for the origin, fetched by the backend inside `/api/routes` or a small `/api/weather`; passed to the draft as `facts.rain`. Shapes and stack: see "Technical Contract" in the spec.

**Testing:** Test-first (red, green, refactor): write one failing test for one behaviour, make it pass, repeat. Test through the public interface only. Seam: the draft endpoint. Tests first: rain fact present → passed to Claude and used in the template; absent or forecast failure → no mention of rain.

**Commits:** Land this ticket as 2 to 5 small commits on the current branch, not one big one. Each commit is one coherent step, leaves the tests passing, and keeps a test together with the code that makes it pass. Imperative subject line ending with `(refs #13)`. Do not use "closes" or "fixes" in a commit message: the ticket is closed by hand after the handoff notes are posted. Fixes from the code review go in their own commit. Suggested split: rain forecast fetch in the backend · rain fact in the draft request and templates with tests · conditions note shows it.

**Review:** Once the acceptance criteria are met and the tests pass, run `/code-review` on this ticket's changes, before writing the handoff notes. Fix every confirmed finding and re-run the tests. Anything you decide not to fix goes in the handoff notes with the reason. Keep the review to this ticket's changes; do not refactor other tickets' work.

**Handoff notes:**

- Before starting: read the spec and the "Handoff notes" comment on every ticket listed under "Blocked by". Trust those notes over the spec where they differ; they describe what was actually built.
- When done, before closing: post one comment titled "Handoff notes" on this ticket with:
  - What was built, in a few lines, and how to run and test it
  - Decisions made and anything that deviates from the spec or this ticket, with the reason
  - Names of the interfaces the next tickets will touch (endpoints, engine inputs and outputs, stored settings), as they actually are
  - Gotchas, known gaps, and anything left unfinished
  - What each ticket blocked by this one should know before it starts
