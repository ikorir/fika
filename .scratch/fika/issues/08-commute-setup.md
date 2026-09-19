# 08 — Commute setup

**What to build:** The commuter sets up their own commute once, in about a minute, with no account: home and work by typing and picking from suggestions, arrival deadline, usual departure time, buffer (default 10), drive or ride-hail, extra minutes (default 5, labelled as parking or pickup wait by mode), and the contact to notify (name, phone number, relationship). It is saved on the device and can be edited. This replaces the hardcoded seed commute, which remains as the first-run default for the demo.

**Blocked by:** 01 — Walking skeleton

**Status:** ready-for-agent

- [ ] Backend Places proxy for autocomplete and place details, restricted to Kenya; no key in the app
- [ ] Address fields show suggestions as the user types and store the chosen place
- [ ] All fields above are editable with sensible defaults
- [ ] Commute persists in AsyncStorage across restarts; editing it refreshes today's result
- [ ] The main screen reads the saved commute instead of the hardcoded one
- [ ] The presenter's real commute is preloaded so the demo never types an address
- [ ] Changing destination and deadline works as a one-off appointment with the same flow
- [ ] Screen matches the design: From, To, Arrive by, Usual departure, Buffer, Parking time (pickup wait for ride-hail), I drive / Ride-hail, contact name, phone, relationship, "Saved on this phone only. No account needed."
- [ ] Opened from the edit-commute button on the Today screen; closing without saving changes nothing

**Technical notes:** `GET /api/places/autocomplete` and `GET /api/places/details` as in the Technical Contract (Places API New, Kenya only). Store `Commute` under one AsyncStorage key; debounce autocomplete requests. Shapes and stack: see "Technical Contract" in the spec.

**Design:** Commute setup. Follow `design/DESIGN.md` (tokens, screen list, behaviour) and the mock-ups in `design/screens/`; live canvas: https://claude.ai/artifact/ACWoARzcKHbdC6Zz7UAY15. The mock-ups are HTML for reference only: build with React Native views and styles.

**Testing:** Test-first (red, green, refactor): write one failing test for one behaviour, make it pass, repeat. Test through the public interface only. Seam, small: commute defaults and validation (buffer 10, extra 5, phone normalised to international digits without a plus) and the save/load round trip. The Places proxy and the form are checked by hand.

**Commits:** Land this ticket as 2 to 5 small commits on the current branch, not one big one. Each commit is one coherent step, leaves the tests passing, and keeps a test together with the code that makes it pass. Imperative subject line ending with `(refs #10)`. Do not use "closes" or "fixes" in a commit message: the ticket is closed by hand after the handoff notes are posted. Fixes from the code review go in their own commit. Suggested split: commute defaults, validation and storage with tests · Places proxy endpoints · setup screen with autocomplete · Today screen reads the saved commute.

**Review:** Once the acceptance criteria are met and the tests pass, run `/code-review` on this ticket's changes, before writing the handoff notes. Fix every confirmed finding and re-run the tests. Anything you decide not to fix goes in the handoff notes with the reason. Keep the review to this ticket's changes; do not refactor other tickets' work.

**Handoff notes:**

- Before starting: read the spec and the "Handoff notes" comment on every ticket listed under "Blocked by". Trust those notes over the spec where they differ; they describe what was actually built.
- When done, before closing: post one comment titled "Handoff notes" on this ticket with:
  - What was built, in a few lines, and how to run and test it
  - Decisions made and anything that deviates from the spec or this ticket, with the reason
  - Names of the interfaces the next tickets will touch (endpoints, engine inputs and outputs, stored settings), as they actually are
  - Gotchas, known gaps, and anything left unfinished
  - What each ticket blocked by this one should know before it starts
