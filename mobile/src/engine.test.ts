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

  it('says no route makes it when none qualifies', () => {
    const result = evaluate({ commute, samples: steps(route('a', 70)), now: at('7:30') });
    expect(result.noRouteOnTime).toBe(true);
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
