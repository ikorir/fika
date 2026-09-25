import type { Commute, Route, Sample } from '@/contract';
import { accident, midTrip, startingPoint } from '@/demo/presets';
import { evaluate } from '@/engine';
import { formatTime } from '@/time';

// A Monday morning in Nairobi. Deadline 9:00, buffer 10, extra 5: on time means arriving by 8:50.
const commute: Commute = {
  version: 2,
  origin: { placeId: '', label: 'Kangemi', location: { lat: -1.264, lng: 36.747 } },
  destination: { placeId: '', label: 'Upper Hill', location: { lat: -1.2985, lng: 36.8155 } },
  arriveBy: '09:00',
  usualDeparture: '08:20',
  bufferMin: 10,
  extraMin: 5,
  mode: 'drive',
  contact: { name: 'Mary', phone: '254700000000', relationship: 'manager' },
  quietWeekends: true,
  contacts: [{ name: 'Mary', phone: '254700000000', relationship: 'manager', tone: 'manager', language: 'en' }],
};

const at = (hhmm: string) => new Date(`2026-09-21T${hhmm.padStart(5, '0')}:00+03:00`);

/** A route taking `min` minutes, `delayMin` of them traffic. */
const route = (id: string, min: number, delayMin = 0): Route => ({
  id,
  label: `via ${id}`,
  durationSec: min * 60,
  staticDurationSec: (min - delayMin) * 60,
  distanceM: 10_000,
  polyline: '',
});

const sample = (hhmm: string, routes: Route[], kind: Sample['kind'] = 'step'): Sample => ({
  departAt: at(hhmm).toISOString(),
  kind,
  routes,
});

/** Samples every 15 min from 7:45 to 8:30, each with the given routes. */
const steps = (...routes: Route[]) => ['7:45', '8:00', '8:15', '8:30'].map((t) => sample(t, routes));

const time = (iso: string | null | undefined) => (iso ? formatTime(iso) : iso);

describe('leave-by', () => {
  it.each([
    { case: 'the latest sample arriving by 8:50', samples: steps(route('a', 40)), leaveBy: '8:00' },
    { case: 'a sample arriving exactly at 8:50', samples: steps(route('a', 45)), leaveBy: '8:00' },
    { case: "judged by each sample's fastest route", samples: steps(route('slow', 60), route('a', 40)), leaveBy: '8:00' },
    {
      case: 'the latest qualifying sample even when an earlier one does not qualify',
      samples: [sample('7:45', [route('a', 40)]), sample('8:00', [route('a', 60)]), sample('8:15', [route('a', 30)])],
      leaveBy: '8:15',
    },
    { case: 'none when no sample arrives by 8:50', samples: steps(route('a', 70)), leaveBy: null },
  ])('is $case', ({ samples, leaveBy }) => {
    const result = evaluate({ commute, samples, now: at('7:30') });
    expect(time(result.leaveBy)).toBe(leaveBy);
  });

  it.each([
    { case: 'no buffer and no extra minutes allow a later departure', bufferMin: 0, extraMin: 0, leaveBy: '8:15' },
    { case: 'a longer buffer asks for an earlier departure', bufferMin: 20, extraMin: 5, leaveBy: '7:45' },
    { case: 'more extra minutes ask for an earlier departure', bufferMin: 10, extraMin: 15, leaveBy: '7:45' },
  ])('moves with the settings: $case', ({ bufferMin, extraMin, leaveBy }) => {
    const result = evaluate({ commute: { ...commute, bufferMin, extraMin }, samples: steps(route('a', 40)), now: at('7:30') });
    expect(time(result.leaveBy)).toBe(leaveBy);
  });

  it('sets a reminder 10 min before leave-by, while that is still ahead', () => {
    expect(time(evaluate({ commute, samples: steps(route('a', 40)), now: at('7:30') }).remindAt)).toBe('7:50');
    expect(evaluate({ commute, samples: steps(route('a', 40)), now: at('7:55') }).remindAt).toBeNull();
    expect(evaluate({ commute, samples: steps(route('a', 70)), now: at('7:30') }).remindAt).toBeNull();
  });

  it('says no route makes it when none qualifies, not even leaving now', () => {
    const samples = [sample('7:30', [route('a', 80), route('b', 90)], 'now'), ...steps(route('a', 80), route('b', 90))];
    const result = evaluate({ commute, samples, now: at('7:30') });
    expect([result.leaveBy, result.noRouteOnTime]).toEqual([null, true]);
  });
});

/** Leaving now at 8:00 on a single route taking `min` minutes: arriving at 8:05 + `min`. */
const leavingNowAt8 = (min: number, selectedRouteId?: string) =>
  evaluate({ commute, samples: [sample('8:00', [route('a', min)], 'now')], now: at('8:00'), selectedRouteId });

describe('state', () => {
  it.each([
    { eta: '8:49', min: 44, state: 'on_time' },
    { eta: '8:50', min: 45, state: 'on_time' },
    { eta: '8:51', min: 46, state: 'at_risk' },
    { eta: '9:00', min: 55, state: 'at_risk' },
    { eta: '9:01', min: 56, state: 'late' },
  ])('is $state arriving at $eta (deadline 9:00, buffer 10)', ({ eta, min, state }) => {
    const result = leavingNowAt8(min);
    expect(time(result.eta)).toBe(eta);
    expect(result.state).toBe(state);
  });
});

describe('routes', () => {
  const leavingNowAt8On = (routes: Route[], selectedRouteId?: string) =>
    evaluate({ commute, samples: [sample('8:00', routes, 'now')], now: at('8:00'), selectedRouteId });
  const recommended = (result: ReturnType<typeof evaluate>) => result.routes.find((r) => r.recommended)?.id;

  it.each([
    { case: 'the earliest arrival', routes: [route('b', 50), route('a', 40)], best: 'a' },
    { case: 'the smaller traffic delay on a tie', routes: [route('x', 45, 15), route('y', 45, 5)], best: 'y' },
    { case: 'the smaller traffic delay on a tie, whatever the order', routes: [route('y', 45, 5), route('x', 45, 15)], best: 'y' },
  ])('recommends $case', ({ routes, best }) => {
    const result = leavingNowAt8On(routes);
    expect(result.routes.filter((r) => r.recommended).map((r) => r.id)).toEqual([best]);
  });

  it('shows each route’s traffic delay as duration − static duration, never below zero', () => {
    const result = leavingNowAt8On([route('a', 45, 12), route('b', 16, -5)]);
    expect(result.routes.map((r) => [r.id, r.trafficDelayMin])).toEqual([
      ['a', 12],
      ['b', 0],
    ]);
  });

  it.each([
    { min: 43, arrive: '8:48', deltaMin: -12, deltaKind: 'early' },
    { min: 45, arrive: '8:50', deltaMin: -10, deltaKind: 'early' },
    { min: 50, arrive: '8:55', deltaMin: -5, deltaKind: 'tight' },
    { min: 55, arrive: '9:00', deltaMin: 0, deltaKind: 'tight' },
    { min: 63, arrive: '9:08', deltaMin: 8, deltaKind: 'late' },
  ])('marks a route arriving at $arrive as $deltaMin min against the deadline, $deltaKind', ({ min, arrive, deltaMin, deltaKind }) => {
    const [view] = leavingNowAt8(min).routes;
    expect([time(view.arriveAt), view.deltaMin, view.deltaKind]).toEqual([arrive, deltaMin, deltaKind]);
  });

  it('selects the recommended route unless another is chosen', () => {
    const routes = [route('a', 40), route('b', 52)];
    expect(leavingNowAt8On(routes).routes.filter((r) => r.selected).map((r) => r.id)).toEqual(['a']);
    expect(leavingNowAt8On(routes, 'b').routes.filter((r) => r.selected).map((r) => r.id)).toEqual(['b']);
    expect(leavingNowAt8On(routes, 'gone').routes.filter((r) => r.selected).map((r) => r.id)).toEqual(['a']);
  });

  it('takes the state from the selected route and offers the route that restores on time', () => {
    const result = leavingNowAt8On([route('a', 40), route('b', 52)], 'b');
    expect([time(result.eta), result.state, recommended(result), result.betterRouteId]).toEqual(['8:57', 'at_risk', 'a', 'a']);
    expect(result.noRouteOnTime).toBe(false);
  });

  it('offers no route when none restores on time', () => {
    const result = leavingNowAt8On([route('a', 48), route('b', 52)], 'b');
    expect([result.state, recommended(result), result.betterRouteId, result.noRouteOnTime]).toEqual([
      'at_risk',
      'a',
      null,
      true,
    ]);
  });

  it('offers nothing to switch to while on time', () => {
    expect(leavingNowAt8On([route('a', 40), route('b', 42)], 'b').betterRouteId).toBeNull();
  });
});

describe('lateness for messaging', () => {
  it.each([
    { min: 45, lateMin: 0, lateMinRounded: 0 },
    { min: 55, lateMin: 0, lateMinRounded: 0 },
    { min: 56, lateMin: 1, lateMinRounded: 5 },
    { min: 60, lateMin: 5, lateMinRounded: 5 },
    { min: 71, lateMin: 16, lateMinRounded: 20 },
  ])('rounds $lateMin min late up to $lateMinRounded', ({ min, lateMin, lateMinRounded }) => {
    const result = leavingNowAt8(min);
    expect([result.lateMin, result.lateMinRounded]).toEqual([lateMin, lateMinRounded]);
  });
});

describe('usual-time projection', () => {
  const usual = (result: ReturnType<typeof evaluate>) =>
    result.usual && { departAt: time(result.usual.departAt), arriveAt: time(result.usual.arriveAt), lateMin: result.usual.lateMin };

  it.each([
    {
      case: 'the fastest route leaving at the usual 8:20, late',
      samples: [sample('8:00', [route('a', 40)]), sample('8:20', [route('a', 55), route('b', 50)], 'usual')],
      usual: { departAt: '8:20', arriveAt: '9:15', lateMin: 15 },
    },
    {
      case: 'on time when the usual departure is early enough',
      samples: [sample('8:20', [route('a', 30)], 'usual')],
      usual: { departAt: '8:20', arriveAt: '8:55', lateMin: 0 },
    },
    {
      case: 'in the traffic of the sample nearest 8:20 when none is exactly at it',
      samples: [sample('8:00', [route('a', 40)]), sample('8:15', [route('a', 50)]), sample('8:30', [route('a', 70)])],
      usual: { departAt: '8:20', arriveAt: '9:15', lateMin: 15 },
    },
  ])('is $case', ({ samples, usual: expected }) => {
    expect(usual(evaluate({ commute, samples, now: at('7:30') }))).toEqual(expected);
  });

  it('is left out once the usual departure has passed', () => {
    const samples = [sample('8:25', [route('a', 40)], 'now')];
    expect(evaluate({ commute, samples, now: at('8:25') }).usual).toBeNull();
  });
});

describe('in the evening', () => {
  it("plans tomorrow's commute", () => {
    const sundayNight = new Date('2026-09-20T22:00:00+03:00');
    const samples = [{ ...sample('7:00', [route('a', 20)], 'now'), departAt: sundayNight.toISOString() }, ...steps(route('a', 40))];
    const result = evaluate({ commute, samples, now: sundayNight });
    expect([result.leaveBy, result.departAt, result.state, result.usual?.departAt]).toEqual([
      at('8:00').toISOString(),
      at('8:00').toISOString(),
      'on_time',
      at('8:20').toISOString(),
    ]);
  });
});

describe('the deadline', () => {
  it("stays the one the samples were fetched for, even once the clock passes the switch to tomorrow's", () => {
    // Fetched at 10:58, two hours before which the screen was about today's 9:00; now it is 11:01.
    const result = evaluate({ commute, samples: [sample('10:58', [route('a', 20)], 'now')], now: at('11:01') });
    expect([result.state, time(result.eta), result.lateMin]).toEqual(['late', '11:26', 146]);
  });
});

describe('arrival', () => {
  it('is departure + duration + extra minutes, for every route', () => {
    const samples = [sample('8:00', [route('a', 40), route('b', 47)])];
    const result = evaluate({ commute, samples, now: at('7:30') });
    expect(result.routes.map((r) => [r.id, r.durationMin, time(r.arriveAt)])).toEqual([
      ['a', 40, '8:45'],
      ['b', 47, '8:52'],
    ]);
  });

  // 8:00 qualifies (arriving 8:45); 8:15 does not (arriving 9:10 in heavier traffic).
  const morning = [sample('7:45', [route('a', 40)]), sample('8:00', [route('a', 40)]), sample('8:15', [route('a', 50)])];

  it.each([
    { case: 'leaving at leave-by while it is ahead', samples: morning, now: '7:30', departAt: '8:00', eta: '8:45' },
    {
      case: "leaving now once leave-by has passed, in the nearest sample's traffic",
      samples: morning,
      now: '8:10',
      departAt: '8:10',
      eta: '9:05',
    },
    {
      case: 'leaving now when nothing qualifies',
      samples: [sample('7:50', [route('a', 60)], 'now'), sample('8:15', [route('a', 60)])],
      now: '7:50',
      departAt: '7:50',
      eta: '8:55',
    },
  ])('assumes $case', ({ samples, now, departAt, eta }) => {
    const result = evaluate({ commute, samples, now: at(now) });
    expect(time(result.departAt)).toBe(departAt);
    expect(time(result.eta)).toBe(eta);
  });
});

describe('Demo mode', () => {
  // The seeded commute on a Monday morning. Leave-by is 8:00 on Waiyaki Way (arriving 8:49); the usual 8:20 is late.
  const waiyaki = (min: number): Route => ({ ...route('waiyaki-way', min, 10), label: 'via Waiyaki Way' });
  const gichuru = (min: number): Route => ({ ...route('james-gichuru-road', min, 8), label: 'via James Gichuru Road' });
  const morning = [
    sample('7:30', [waiyaki(38), gichuru(45)]),
    sample('7:45', [waiyaki(39), gichuru(47)]),
    sample('8:00', [waiyaki(44), gichuru(50)]),
    sample('8:20', [waiyaki(50), gichuru(55)], 'usual'),
    sample('8:30', [waiyaki(55), gichuru(58)]),
  ];
  const selected = (result: ReturnType<typeof evaluate>) => result.routes.find((r) => r.selected)!;
  const delay = { routeId: 'waiyaki-way', addMin: 25, cause: 'Accident on Waiyaki Way' };

  it.each([
    { case: 'no simulation', simulation: undefined, simulated: false, label: null },
    { case: 'an empty simulation', simulation: {}, simulated: false, label: null },
    { case: 'a delay', simulation: { delay }, simulated: true, label: 'Waiyaki Way +25 min' },
    { case: 'a clock', simulation: { clock: at('7:40').toISOString() }, simulated: true, label: 'Clock set to 7:40' },
    {
      case: 'a trip under way',
      simulation: { midTrip: { routeId: 'waiyaki-way', departedAt: at('8:20').toISOString() } },
      simulated: true,
      label: 'Left at 8:20',
    },
    {
      case: 'both',
      simulation: { delay, clock: at('8:40').toISOString() },
      simulated: true,
      label: 'Waiyaki Way +25 min · Clock set to 8:40',
    },
  ])('reports $case as $label', ({ simulation, simulated, label }) => {
    const result = evaluate({ commute, samples: morning, now: at('7:40'), simulation });
    expect([result.simulated, result.simulationLabel]).toEqual([simulated, label]);
  });

  it('replaces the clock with the simulated one', () => {
    const sundayNight = new Date('2026-09-20T22:00:00+03:00');
    const clock = at('7:40').toISOString();
    const result = evaluate({ commute, samples: morning, now: sundayNight, simulation: { clock } });
    expect([time(result.now), time(result.departAt), time(result.remindAt), result.state]).toEqual([
      '7:40',
      '8:00',
      '7:50',
      'on_time',
    ]);
  });

  it('turns the shown route at risk with the accident preset, and recommends the other route', () => {
    const live = evaluate({ commute, samples: morning, now: at('7:40') });
    const route = selected(live);
    const result = evaluate({
      commute,
      samples: morning,
      now: at('7:40'),
      selectedRouteId: route.id,
      simulation: { delay: accident(route) },
    });
    expect([live.state, route.id]).toEqual(['on_time', 'waiyaki-way']);
    expect([result.state, time(result.eta), selected(result).id]).toEqual(['at_risk', '8:54', 'waiyaki-way']);
    expect([result.routes.find((r) => r.recommended)?.id, result.betterRouteId]).toEqual([
      'james-gichuru-road',
      'james-gichuru-road',
    ]);
  });

  it('turns it late with the mid-trip preset: 20 min after leaving at the usual 8:20, into the accident', () => {
    const route = selected(evaluate({ commute, samples: morning, now: at('7:40') }));
    const simulation = { delay: accident(route), ...midTrip(commute, morning, route.id, accident(route)) };
    const result = evaluate({ commute, samples: morning, now: at('7:40'), selectedRouteId: route.id, simulation });
    // 20 of the 75 min gone; the other 55/75 in the 8:30 traffic (80 min) take 59 min, + 5 extra.
    expect([time(result.now), result.state, time(result.eta), result.lateMinRounded, selected(result).id]).toEqual([
      '8:40',
      'late',
      '9:44',
      45,
      'waiyaki-way',
    ]);
  });

  it.each([
    { case: 'in the traffic at the clock, 20 min into the trip', clock: '8:40', eta: '9:18' },
    { case: 'as planned before leaving', clock: '8:10', eta: '9:15' },
    { case: 'as planned once the trip is over', clock: '9:15', eta: '9:15' },
  ])('projects a trip that left at 8:20 on Waiyaki Way (50 min, then 55 at 8:30) $case', ({ clock, eta }) => {
    const simulation = { clock: at(clock).toISOString(), midTrip: { routeId: 'waiyaki-way', departedAt: at('8:20').toISOString() } };
    const result = evaluate({ commute, samples: morning, now: at('7:40'), simulation });
    expect([time(result.departAt), time(result.eta)]).toEqual(['8:20', eta]);
  });

  it('offers no route to switch to while on the road', () => {
    const simulation = {
      delay,
      clock: at('8:05').toISOString(),
      midTrip: { routeId: 'waiyaki-way', departedAt: at('7:45').toISOString() },
    };
    const result = evaluate({ commute, samples: morning, now: at('7:40'), simulation });
    expect([result.state, result.routes.find((r) => r.recommended)?.id, result.betterRouteId]).toEqual([
      'at_risk',
      'james-gichuru-road',
      null,
    ]);
  });

  it('runs the stage arc from the evening before: on time at the start, at risk after the accident, late mid-trip', () => {
    const sundayNight = new Date('2026-09-20T22:00:00+03:00');
    const samples = [{ ...sample('7:00', [waiyaki(18), gichuru(20)], 'now'), departAt: sundayNight.toISOString() }, ...morning];
    const live = evaluate({ commute, samples, now: sundayNight });
    const route = selected(live);
    const arc = [
      startingPoint(live),
      { ...startingPoint(live), delay: accident(route) },
      { ...startingPoint(live), delay: accident(route), ...midTrip(commute, samples, route.id, accident(route)) },
    ].map((simulation) => evaluate({ commute, samples, now: sundayNight, selectedRouteId: route.id, simulation }));
    expect(arc.map((e) => [time(e.now), e.state, time(e.eta), e.simulationLabel])).toEqual([
      ['7:40', 'on_time', '8:49', 'Clock set to 7:40'],
      ['7:40', 'at_risk', '8:54', 'Waiyaki Way +25 min · Clock set to 7:40'],
      ['8:40', 'late', '9:44', 'Waiyaki Way +25 min · Clock set to 8:40'],
    ]);
  });

  it('keeps mid-trip on the accident after the presenter switches routes, as the script does', () => {
    const route = selected(evaluate({ commute, samples: morning, now: at('7:40') }));
    const delay = accident(route);
    const simulation = { delay, ...midTrip(commute, morning, 'james-gichuru-road', delay) };
    const result = evaluate({ commute, samples: morning, now: at('7:40'), selectedRouteId: 'james-gichuru-road', simulation });
    expect([result.state, time(result.eta), selected(result).id]).toEqual(['late', '9:44', 'waiyaki-way']);
  });
});
