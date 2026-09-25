# Fika v2 — polish and wow plan

Companion to `SPEC.md` (the contract) and `PITCH.md` (the demo). This file is the architecture and work plan for
making Fika feel like a senior team built it, plus the features that earn a "wow" on stage. Nothing here changes the
contract in `SPEC.md` unless the section says so; those changes go to `SPEC.md` and issue #2 first, then here.

Numbering: **P1–P11** are the polish items, **W1–W12** the new features. Tickets are named after them.

## Goals

1. Every tap answers back: press feedback, haptics, and motion on every state change.
2. The screen never snaps or jumps: skeletons at first load, animated transitions after.
3. Sheets behave like native sheets: draggable, keyboard-aware.
4. The maths stays visible and trustworthy: the departure window, the "why" sheet, the notice log.
5. Nothing in the engine or the backend contract breaks. All new behaviour is additive.

## Principles

- **The engine stays pure.** `evaluate()` takes a commute, samples, a clock and a simulation and returns an
  `Evaluation`. New features that need maths (departure window, holidays, return trip, recap) add pure functions
  next to it, tested with Jest, and the screens render the result. No screen does its own arithmetic.
- **Motion is a system, not a sprinkle.** One token set for durations and easings, one `Press` component, one
  `useReduceMotion` hook, and Reanimated everywhere. The RN `Animated` API is retired.
- **Storage stays local and versioned.** One key per concern under the `fika.` prefix, each with a `version`
  field and a `withDefaults()` reader like `commute.ts` has today. No accounts, no server state.
- **Design first.** Any new screen, row or sheet gets added to `design/DESIGN.md` (and the canvas) before it is built.
- **Feature flags for stage safety.** Anything that can fail live (Live Activity, background fetch, calendar) sits
  behind a flag in `src/flags.ts` so it can be switched off before the demo without a rebuild.

## Architecture

### Module map after v2

```
mobile/src
  theme.ts            tokens: colour, type, space, radius, size, + motion (new)
  flags.ts            feature flags read from app.json extra + AsyncStorage overrides (new)
  contract.ts         unchanged shapes; additive fields noted below
  engine.ts           evaluate() unchanged; new pure siblings:
  engine/
    window.ts         departureWindow(evaluation, samples): WindowBlock[]         (W1)
    explain.ts        explain(evaluation, commute): Explanation                  (W2)
    toll.ts           tollFor(route): { kes: number } | null                     (W3)
    holidays.ts       isPublicHoliday(date), nextCommuteDay(date, quiet)         (W6, P11)
  store/              versioned AsyncStorage readers/writers (new)
    commute.ts        moved from src/commute.ts; adds returnTrip, quietWeekends, arriveByByDay, contacts[]
    history.ts        one row per morning evaluation and per notice sent          (W8)
    flags.ts          local flag overrides
  ui/                 shared primitives (new)
    Press.tsx         Pressable + scale/opacity + optional haptic                 (P1)
    haptics.ts        one function per moment                                    (P2)
    motion.ts         Reanimated entering/exiting presets bound to tokens        (P3)
    useReduceMotion.ts                                                            (P9)
    RollingDigits.tsx                                                             (P7)
    Skeleton.tsx                                                                  (P5)
    Sheet.tsx         @gorhom/bottom-sheet wrapper, replaces setup/Sheet.tsx     (P4)
    EmptyState.tsx                                                                (P8)
    CountdownRing.tsx                                                             (W11)
  today/              existing; MapArea, Hero, RouteList, ActionArea gain motion and new children
    DepartureWindow.tsx                                                           (W1)
    WhySheet.tsx                                                                  (W2)
    RecapCard.tsx                                                                 (W8)
  notice/             existing; NoticeSheet moves onto ui/Sheet; adds
    EtaCard.tsx       the shareable image, captured with react-native-view-shot  (W4)
    recipients.ts     fan-out to two contacts                                    (W9)
  live/               Live Activity bridge, iOS only, behind a flag              (P11)
  app/
    welcome.tsx       first-run screen                                           (P11)
    index.tsx, setup.tsx  existing
backend
  lib/tolls.ts        Nairobi Expressway toll table                              (W3)
  app/api/routes      adds toll per route when the label matches                 (W3)
```

### Data model changes

All additive. Readers default missing fields so an existing phone keeps working.

**Stored commute** (`fika.commute`, version 2):

```ts
type Commute = {
  ...existing,
  version: 2,
  arriveByByDay?: Partial<Record<'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun', string>>; // P11, overrides arriveBy
  quietWeekends: boolean;                       // P11, default true
  returnTrip?: { homeBy: string };              // W5, "HH:mm"; origin/destination are flipped at evaluate time
  contacts: Contact[];                          // W9; contacts[0] is today's `contact`; the reader mirrors both
};
type Contact = { name: string; phone: string; relationship: string; tone: 'manager'|'friend'; language: 'en'|'sw'|'sheng' };
```

**History** (`fika.history`, version 1, capped at 60 rows):

```ts
type HistoryRow =
  | { kind: 'morning'; date: string; state: Evaluation['state']; route: string; lateMin: number; leaveBy: string | null }
  | { kind: 'notice'; at: string; to: string; channel: 'whatsapp'|'sms'|'share'; lateMin: number; eta: string };
```

Written from the Today screen once per calendar day on the first evaluation, and from `notice/send.ts` on each send.

**Route** (backend contract, additive): `toll?: { kes: number }`. The app shows it when present. Spec change: one
optional field on `Route` in `SPEC.md`.

**Flags** (`app.json` `extra.flags` for defaults, `fika.flags` for local overrides):
`liveActivity`, `backgroundReminder`, `calendar`, `recap`, `secondContact`.

### Engine additions (pure, tested)

- `departureWindow(samples, commute, selectedRouteId): WindowBlock[]` — one block per sample: `departAt`, `arriveAt`,
  `kind: 'early'|'tight'|'late'`, `chosen: boolean`. Reuses the delta logic in `engine.ts`; extract it into
  `deltaKind(arriveAt, deadline, bufferMin)` so both share it.
- `explain(evaluation, commute): Explanation` — `{ deadline, buffer, samples: [{departAt, arriveAt, verdict}], chosen, reason }`
  where `reason` is one of a fixed set of enum keys the screen turns into words. No prose in the engine.
- `tollFor(route)` — matches `label` against the Expressway and returns the fixed toll; the backend does the same
  server side so the app only needs it for saved routes.
- `isPublicHoliday(date)` — a static table for the current year; `nextCommuteDay(date, quietWeekends)` used by the
  daily reminder scheduler.
- Return trip: no engine change. The screen builds `{ ...commute, origin: destination, destination: origin, arriveBy: homeBy }`
  and calls `evaluate()` as usual. `useRoutes` takes the evaluated commute so it fetches the flipped pair.
- Recap: `recap(rows: HistoryRow[], weekOf: Date): Recap` — counts by state, most-used route, average late minutes.

### Motion system

- Tokens in `theme.ts`: `motion.duration = { fast: 150, base: 250, slow: 400 }`, `motion.easing = Easing.out(Easing.cubic)`,
  `motion.pressScale = 0.97`.
- `ui/motion.ts` exports presets: `enter = FadeInDown.duration(base)`, `exit = FadeOut.duration(fast)`,
  `layout = LinearTransition.duration(base)`. Every preset returns `undefined` when reduce motion is on, so call sites
  never branch.
- `Press` wraps `Pressable` with `useSharedValue` scale and opacity, `hitSlop` 8 by default, and an optional
  `haptic` prop that maps to `ui/haptics.ts`.
- Hero value: `RollingDigits` keyed on the string; colour via `interpolateColor` over a shared value that tracks the
  state index (0 on time, 1 at risk, 2 late). Status pill and dot share the same shared value.
- Route rows: `Animated.View layout={layout}`; the radio scales in with `withSpring`.
- Map: `animateCamera` on selection change (400 ms); "Switch to" adds a 55° pitch fly-through then settles.
- Skeleton: one shimmer `useSharedValue` shared by all blocks via context, so a screen full of blocks shimmers in phase.
- `usePulse.ts` is removed once the hero moves to Reanimated.

### Sheet system

- `ui/Sheet.tsx` wraps `BottomSheetModal` from `@gorhom/bottom-sheet`: handle, backdrop that fades with drag,
  `enableDynamicSizing`, top radius 32 from the tokens, scrim colour from the tokens, `BottomSheetScrollView` body,
  `BottomSheetTextInput` re-exported for the notice editor.
- `_layout.tsx` gains `GestureHandlerRootView` and `BottomSheetModalProvider`.
- Callers keep the same props as today (`visible`, `title`, `onClose`, children). The wrapper turns `visible` into
  `present()`/`dismiss()` so the five existing sheets migrate by changing an import.

### Haptics map

| Moment | Haptic | Called from |
| --- | --- | --- |
| Route or chip selected | impact light | `RouteList`, language and tone chips, demo scenarios |
| Reminder set | notification success | `useOneOffReminder.toggle` |
| State becomes at risk | notification warning | `useEffect` on `evaluation.state` in `index.tsx` |
| State becomes late | notification error | same |
| Send on WhatsApp / SMS / Share | impact medium | `notice/send.ts` |
| Sheet dismissed by drag | selection | `ui/Sheet` |

Nothing fires while reduce motion is on or when the app is in Demo mode's clock steps (they would buzz on every tap).

### Live Activity (P11, iOS, flagged)

- Config plugin `@bacons/apple-targets` adds a widget extension with one ActivityKit activity:
  `{ leaveBy, route, state }`. A tiny native module `live/LiveActivity.ts` exposes `start`, `update`, `end`.
- Started by the Today screen when `remindAt` is within 30 minutes; updated on each evaluation; ended after leave-by.
- Android gets an ongoing notification with the same text via `expo-notifications`, no extension needed.
- Behind `flags.liveActivity`; the pitch has a static screenshot as fallback.

### Backend changes

- `POST /api/routes`: `toll` on each route when `lib/tolls.ts` matches the label. Test in `google-routes.test.ts`.
- No other endpoint changes. The ETA card, recap, calendar and history are all on-device.
- Background reminder (W12, flagged): the app calls `/api/routes` from an `expo-background-task` roughly ten minutes
  before the daily reminder and rewrites the reminder body. One call, not polling; the spec's "no background polling"
  line gets a one-sentence amendment.

### Testing strategy

- **Jest, pure:** `engine/*`, `store/*` readers and migrations, `RollingDigits` diff helper, `haptics` state map,
  `recap`, `holidays`, `updatedLabel` ticks, reminder scheduling with quiet weekends and holidays.
- **Jest, render:** `Press`, `EmptyState`, `DepartureWindow`, `WhySheet` with `@testing-library/react-native`
  (add as dev dependency). Reanimated uses its Jest mock.
- **Backend, vitest:** tolls on routes.
- **On device, argent:** a saved flow per phase that walks on time → at risk → late → notice, captured at 100% and
  150% text scale, reduce motion off and on. `screenshot-diff` against the previous build for the hero, route card
  and sheets.
- Every ticket keeps `npm test` and `npm run typecheck` green in `mobile/` and `backend/`.

## Work breakdown

Each row is one GitHub issue in the existing ticket format (Blocked by, Testing, Commits, Handoff notes). Hours are
focused hours with Claude Code.

### Phase A — foundations (P1, P2, P9) · 3 h

| Ticket | Scope | Blocked by |
| --- | --- | --- |
| A1 Motion tokens and Press | `theme.motion`, `ui/Press`, `ui/motion`, `useReduceMotion`; replace every `Pressable` | — |
| A2 Haptics | `expo-haptics`, `ui/haptics`, wire the six moments | A1 |
| A3 Text scale | hero 64→52 above 1.3 font scale; audit `numberOfLines` on the hero and route rows | A1 |

### Phase B — motion (P3, P5, P7) · 6 h

| Ticket | Scope | Blocked by |
| --- | --- | --- |
| B1 Hero and pill on Reanimated | shared state value, colour interpolation, remove `usePulse` | A1 |
| B2 List and card transitions | layout animation on routes, enter/exit on notice card, error box, banner | A1 |
| B3 Rolling digits | `ui/RollingDigits` + hero value + route arrivals | B1 |
| B4 Skeletons | `ui/Skeleton`, hero and route card placeholders, spinner removed | A1 |

### Phase C — sheets (P4) · 4 h

| Ticket | Scope | Blocked by |
| --- | --- | --- |
| C1 Shared sheet | `@gorhom/bottom-sheet`, `ui/Sheet`, providers in `_layout` | A1 |
| C2 Migrate five sheets | notice, demo, address, picker, time; keyboard over the editor verified | C1 |

### Phase D — map (P6) · 4 h

| Ticket | Scope | Blocked by |
| --- | --- | --- |
| D1 Camera motion | `animateCamera` on select, pitch fly on switch | A1 |
| D2 Glow, gradient, markers | under-glow polyline, bottom gradient, ETA bubbles with tail, pulsing incident | D1 |
| D3 Blurred controls | `expo-blur` behind header controls | — |

### Phase E — states and signals (P8, P10) · 4 h

| Ticket | Scope | Blocked by |
| --- | --- | --- |
| E1 Empty states | `ui/EmptyState`: no route, offline, no commute, notifications denied | A1 |
| E2 Refresh and freshness | `RefreshControl`, live "Updated n min ago", amber dot past ten minutes | — |
| E3 Splash and icon | fade-in root, new icon and splash assets | — |

### Phase F — product (P11) · 5 h

| Ticket | Scope | Blocked by |
| --- | --- | --- |
| F1 Welcome screen | `app/welcome.tsx`, routing on empty commute, DESIGN.md update | E3 |
| F2 Settings rows | quiet weekends, per-day arrive-by, `store/commute` v2 migration, scheduler tests | — |
| F3 Live Activity | flagged; `@bacons/apple-targets`, `live/`, Android ongoing notification | F2 |

### Phase G — wow features · in the order below

| Ticket | Feature | Hours | Blocked by | Spec change |
| --- | --- | --- | --- | --- |
| W1 | Departure window strip | 2 | B2 | none |
| W3 | Expressway toll | 1 | — | `Route.toll` |
| W6 | Kenya public holidays | 1 | F2 | none |
| W2 | "Why" sheet | 2 | C1 | none |
| W4 | Shareable ETA card | 3 | C2 | none |
| W5 | Return trip toggle | 3 | F2 | remove "multiple saved commutes" caveat for the reverse trip |
| W11 | Countdown ring | 2 | B1 | none |
| W8 | History and weekly recap | 4 | F2 | none; "learning from past trips" stays out, this is a count |
| W9 | Two recipients | 2 | C2, F2 | contact → contacts |
| W7 | Calendar deadline | 3 | F2 | flagged; out-of-scope line amended |
| W10 | Ride-hail hand-off | 1 | — | deep link only, no booking |
| W12 | Smarter reminder body | 3 | F2 | flagged; one background fetch, not polling |

### Schedule

- **Day 1:** A1–A3, B1–B4, E1–E3, W1, W3, W6. The app already feels different by the end of the day.
- **Day 2:** C1–C2, D1–D3, W2, W4, W5, W11.
- **Day 3:** F1–F3, W8, W9, W7, W10, W12.
- Freeze: nothing flagged ships to the demo phone unless it has survived two full rehearsal runs.

## Dependencies to add

`mobile/`: `expo-haptics`, `expo-blur`, `expo-linear-gradient`, `@gorhom/bottom-sheet`, `react-native-view-shot`,
`expo-calendar` (W7), `expo-background-task` (W12), `@bacons/apple-targets` (F3), dev: `@testing-library/react-native`.
All native, so one dev client rebuild per platform at the start of Day 1 and again before F3.

## Risks

- **Reanimated 4 with RN 0.86:** already installed and unused, so the first ticket (A1) proves the toolchain before
  anything else depends on it.
- **Bottom sheet inside `Modal`:** the library wants to be outside native modals. `ui/Sheet` uses `BottomSheetModal`
  with the provider at the root, never nested in RN `Modal`.
- **Live Activity signing:** needs the widget target signed under the same team. Flagged, with a screenshot fallback.
- **Demo phone performance:** skeletons, shimmer and map glow are cheap, but the pitch shows a route switch with camera
  motion on a real device, so D1 gets a rehearsal on the actual phone, not the simulator.
- **Scope creep:** anything not in the tables above is a new ticket, not a bigger one.
