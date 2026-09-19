# Fika

Commute decision assistant: Expo app plus Next.js backend. Read `SPEC.md` (also issue #2 on `ikorir/fika`) before any work; it holds the Technical Contract. The look is fixed by `design/DESIGN.md` and `design/screens/`.

## Working a ticket

Tickets are GitHub issues on `ikorir/fika`, labelled `ready-for-agent`. Work one ticket at a time, and only one whose "Blocked by" issues are all closed.

1. Read the ticket, the spec, and the "Handoff notes" comment on every blocking ticket. Where notes and spec differ, the notes describe what was actually built.
2. Follow the ticket's Testing section. Where it says test-first, write the failing test first.
3. Commit as you go: 2 to 5 small commits per ticket, as the ticket's Commits section describes. This is an auto-commit workflow: commit without asking. Commit to the current branch; do not create or switch branches. Do not push unless asked.
4. When the acceptance criteria are met and the tests pass, run `/code-review` on the ticket's changes, fix confirmed findings in their own commit, and re-run the tests.
5. Post one "Handoff notes" comment on the ticket (contents listed in the ticket), tick the acceptance criteria, then close the ticket.

Never put API keys in the app or in a commit. Keys live in the backend's environment variables only.
