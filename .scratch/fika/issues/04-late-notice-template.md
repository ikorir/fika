# 04 — Late notice, template version

**What to build:** When the state is late, the commuter gets a ready-to-send notice containing their ETA and how late they will be, can edit it, and sends it themselves. WhatsApp opens with the message prefilled to the saved contact (seeded for now); SMS is the fallback; the system share sheet covers group chats. The app never sends anything on its own. The wording is a deterministic template in this ticket.

**Blocked by:** 02 — Leave-by time and the three states

**Status:** ready-for-agent

- [ ] Late state offers "Review late notice"; the draft shows the ETA exactly as on screen and lateness rounded up to 5 minutes
- [ ] The draft is editable before sending
- [ ] WhatsApp option opens WhatsApp with the text prefilled to the contact's number (international digits, no plus sign)
- [ ] SMS fallback opens the SMS composer prefilled; used when WhatsApp cannot be opened
- [ ] Share option opens the system share sheet with the text
- [ ] Nothing is sent without the user tapping send in the target app
- [ ] Verified by hand on a real phone, including what a link with no number does
- [ ] When no route can arrive on time, the screen leads straight to the notice
- [ ] Late state shows the notice preview card; the editor opens as a bottom sheet over it
- [ ] ETA and lateness show as locked chips labelled "from your route, not AI", with the line "Fika opens a prefilled message. Nothing goes out until you press send."
- [ ] "Send on WhatsApp" is the primary button; SMS and Share sit side by side below it

**Technical notes:** Template wording is a pure function of `Evaluation` plus contact, in the app. Sending uses `Linking.openURL` with `https://wa.me/<digits>?text=<encoded>` and `sms:`, and the React Native share API. Check `sms:` body syntax on both iOS and Android. Shapes and stack: see "Technical Contract" in the spec.

**Design:** Today · late (notice preview card, "Review and send notice") and Late notice sheet (without the tone and language controls, which are ticket 06). Follow `design/DESIGN.md` (tokens, screen list, behaviour) and the mock-ups in `design/screens/`; live canvas: https://claude.ai/artifact/ACWoARzcKHbdC6Zz7UAY15. The mock-ups are HTML for reference only: build with React Native views and styles.

**Testing:** Test-first (red, green, refactor): write one failing test for one behaviour, make it pass, repeat. Test through the public interface only. Seam: the template function (Evaluation + contact → message) and the link builder (phone + text → WhatsApp and SMS URLs, correctly encoded). Opening WhatsApp, SMS and the share sheet is checked by hand on a real phone.

**Commits:** Land this ticket as 2 to 5 small commits on the current branch, not one big one. Each commit is one coherent step, leaves the tests passing, and keeps a test together with the code that makes it pass. Imperative subject line ending with `(refs #6)`. Do not use "closes" or "fixes" in a commit message: the ticket is closed by hand after the handoff notes are posted. Fixes from the code review go in their own commit. Suggested split: template message with tests · WhatsApp and SMS link builder with tests · notice preview card and bottom sheet · send, SMS fallback and share actions.

**Review:** Once the acceptance criteria are met and the tests pass, run `/code-review` on this ticket's changes, before writing the handoff notes. Fix every confirmed finding and re-run the tests. Anything you decide not to fix goes in the handoff notes with the reason. Keep the review to this ticket's changes; do not refactor other tickets' work.

**Handoff notes:**

- Before starting: read the spec and the "Handoff notes" comment on every ticket listed under "Blocked by". Trust those notes over the spec where they differ; they describe what was actually built.
- When done, before closing: post one comment titled "Handoff notes" on this ticket with:
  - What was built, in a few lines, and how to run and test it
  - Decisions made and anything that deviates from the spec or this ticket, with the reason
  - Names of the interfaces the next tickets will touch (endpoints, engine inputs and outputs, stored settings), as they actually are
  - Gotchas, known gaps, and anything left unfinished
  - What each ticket blocked by this one should know before it starts
