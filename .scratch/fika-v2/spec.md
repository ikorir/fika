# Fika v2 — batch spec

Batch: tickets `01–09` in `issues/`, authorized by the user on 2026-09-25 for hands-free coordinated execution.

- Product contract: `SPEC.md` at the repo root, including its "v2 amendments" section. Where a ticket and `SPEC.md` differ, stop and report; do not change the spec.
- Architecture and resolved decisions: `PLAN.md` at the repo root. Tickets cite its sections and decisions `D1–D14`.
- Look: `design/DESIGN.md` tokens and the six mock-ups in `design/screens/`. A ticket that adds UI adds a short entry to `design/DESIGN.md` (screen table or "Behaviour the design adds") using only existing tokens.
- Checks every ticket keeps green: in `mobile/`, `npm test` and `npm run typecheck`; in `backend/`, `npm test` and `npm run typecheck` when the backend is touched.
- Device checks are run by the coordinator on the iOS simulator with argent (PLAN.md D14).
