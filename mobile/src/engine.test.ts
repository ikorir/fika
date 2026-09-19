import type { Commute, Route, Sample } from '@/contract';
import { evaluate } from '@/engine';
import { formatTime } from '@/time';

// A Monday morning in Nairobi. Deadline 9:00, buffer 10, extra 5: on time means arriving by 8:50.
const commute: Commute = {
  origin: { placeId: '', label: 'Kangemi', location: { lat: -1.264, lng: 36.747 } },
  destination: { placeId: '', label: 'Upper Hill', location: { lat: -1.2985, lng: 36.8155 } },
  arriveBy: '09:00',
  usualDeparture: '08:20',
  bufferMin: 10,
  extraMin: 5,
  mode: 'drive',
  contact: { name: 'Mary', phone: '254700000000', relationship: 'manager' },
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
