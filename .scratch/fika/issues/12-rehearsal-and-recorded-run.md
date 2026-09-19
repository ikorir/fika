# 12 — Rehearsal and recorded run

**What to build:** The team can deliver the demo inside five minutes on a hard clock, from a projected simulator with a phone on Expo Go as backup, and holds a recorded clean run as the last resort. Done by people, not an agent. Rehearsals start at hour 9; features freeze at hour 10.

**Blocked by:** 10 — Offline demo data

**Status:** ready-for-human

- [ ] Opening line says the track ("Everyday"), the recurring job, and who does it today
- [ ] Three timed run-throughs finish under 4:40 following the script in the spec
- [ ] One run-through done in airplane mode
- [ ] Phone backup is charged, on Expo Go, with the commute loaded and WhatsApp signed in
- [ ] A clean run is screen-recorded and stored on the presenting laptop
- [ ] One person presents, one drives; both know the reset tap

**Testing:** No automated tests: this ticket is the manual check of everything the suite does not cover. Run the full test suites once before the first rehearsal.

**Commits:** No code in this ticket, so no commits. If a rehearsal finds a bug, fix it under the ticket that owns that behaviour.

**Review:** No code changes in this ticket, so no code review.

**Handoff notes:**

- Before starting: read the spec and the "Handoff notes" comment on every ticket listed under "Blocked by". Trust those notes over the spec where they differ; they describe what was actually built.
- When done, before closing: post one comment titled "Handoff notes" on this ticket with:
  - What was built, in a few lines, and how to run and test it
  - Decisions made and anything that deviates from the spec or this ticket, with the reason
  - Names of the interfaces the next tickets will touch (endpoints, engine inputs and outputs, stored settings), as they actually are
  - Gotchas, known gaps, and anything left unfinished
  - What each ticket blocked by this one should know before it starts
