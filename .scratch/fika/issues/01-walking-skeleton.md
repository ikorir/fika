# 01 — Walking skeleton: a real ETA on the phone

**What to build:** The Expo app and the Next.js backend both exist, and the backend is deployed on Vercel. Opening the app requests routes for the seeded real commute (hardcoded for now), leaving now. The backend calls Google Routes (driving, traffic-aware, alternatives on) and the app shows a card per route with its main-road name and ETA. This is the pre-work ticket and proves the Google key and billing work.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Expo app runs in Expo Go on a simulator and on a real phone
- [ ] Next.js backend is deployed on Vercel; the app talks to the deployed URL, never to a laptop
- [ ] Google and Anthropic keys live only in backend environment variables
- [ ] Routes endpoint returns, for a "leave now" departure, up to 3 routes each with label, duration, static (no-traffic) duration, distance and encoded polyline
- [ ] App shows one card per route with the road name and ETA for the seeded Nairobi commute
- [ ] One real response is saved aside for later use as the offline demo fixture
- [ ] Test runners are set up in both projects with one passing placeholder test each
- [ ] Theme tokens and Figtree are set up once and used by the route cards; cards match the route list in the design
- [ ] Today screen is split into separate components, one file each, with placeholders where needed: map area, hero (status, time, decision line, conditions note), route list, action area, plus a separate setup screen route. Wave 2 tickets then edit different files and can be built in parallel without conflicts
- [ ] Every library named in the spec's Technical Contract is installed now in both projects (maps, notifications, storage, polyline, Figtree, zod, Anthropic SDK), so later tickets do not touch the package files or lockfiles

**Technical notes:** Create the repository layout (Expo app and Next.js backend side by side), the theme tokens, and `POST /api/routes` returning `RoutesResponse` with a single `now` sample. Use the Google Routes request and field mask from the spec's Technical Contract. Record the folder layout, run commands and the deployed URL in the handoff notes; every later ticket depends on them. Shapes and stack: see "Technical Contract" in the spec.

**Design:** Today · on time (route list only). Set up the dark theme, colour tokens and the Figtree font here so later tickets reuse them. Follow `design/DESIGN.md` (tokens, screen list, behaviour) and the mock-ups in `design/screens/`; live canvas: https://claude.ai/artifact/ACWoARzcKHbdC6Zz7UAY15. The mock-ups are HTML for reference only: build with React Native views and styles.

**Testing:** No TDD: this ticket is wiring. Set up `jest-expo` in the app and vitest in the backend with one passing placeholder test each, so later tickets can start with a failing test. Check by hand: real ETAs for the seeded commute show on a simulator and a phone.

**Commits:** Land this ticket as 2 to 5 small commits on the current branch, not one big one. Each commit is one coherent step, leaves the tests passing, and keeps a test together with the code that makes it pass. Imperative subject line ending with `(refs #3)`. Do not use "closes" or "fixes" in a commit message: the ticket is closed by hand after the handoff notes are posted. Fixes from the code review go in their own commit. Suggested split: Expo app scaffold with theme tokens and test runner · Next.js backend scaffold with test runner · routes endpoint calling Google Routes · app fetches and shows route cards.

**Review:** Once the acceptance criteria are met and the tests pass, run `/code-review` on this ticket's changes, before writing the handoff notes. Fix every confirmed finding and re-run the tests. Anything you decide not to fix goes in the handoff notes with the reason. Keep the review to this ticket's changes; do not refactor other tickets' work.

**Handoff notes:**

- Before starting: read the spec and the "Handoff notes" comment on every ticket listed under "Blocked by". Trust those notes over the spec where they differ; they describe what was actually built.
- When done, before closing: post one comment titled "Handoff notes" on this ticket with:
  - What was built, in a few lines, and how to run and test it
  - Decisions made and anything that deviates from the spec or this ticket, with the reason
  - Names of the interfaces the next tickets will touch (endpoints, engine inputs and outputs, stored settings), as they actually are
  - Gotchas, known gaps, and anything left unfinished
  - What each ticket blocked by this one should know before it starts
