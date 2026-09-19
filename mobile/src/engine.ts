// The commute engine: every commute decision the screen shows, from the commute, the route samples and the clock.
// Pure: no I/O, the clock is passed in. See SPEC.md → Technical Contract → Commute engine.
import type { Commute, Evaluation, Route, RouteView, Sample } from '@/contract';
import { commuteDeadline, nairobiTimeOnDay } from '@/time';

const MIN = 60_000;
const REMIND_BEFORE_MIN = 10;
const LATENESS_STEP_MIN = 5;

/** Whole minutes throughout, so every number on screen adds up: leaving 8:05 + 40 min + 5 extra = 8:50. */
const floorToMinute = (ms: number) => Math.floor(ms / MIN) * MIN;
const minutes = (sec: number) => Math.round(sec / 60);
const iso = (ms: number) => new Date(ms).toISOString();

type Input = { commute: Commute; samples: Sample[]; now: Date; selectedRouteId?: string };
type Departure = { departMs: number; routes: Route[] };

/** Needs at least one sample with a route; throws otherwise. */
export function evaluate({ commute, samples, now, selectedRouteId }: Input): Evaluation {
  const nowMs = floorToMinute(now.getTime());
  const deadlineMs = Date.parse(commuteDeadline(commute.arriveBy, now));
  const onTimeByMs = deadlineMs - commute.bufferMin * MIN;

  const departures: Departure[] = samples
    .filter((s) => s.routes.length > 0)
    .map((s) => ({ departMs: floorToMinute(Date.parse(s.departAt)), routes: s.routes }));
  if (departures.length === 0) throw new Error('evaluate() needs at least one sample with a route.');

  const arrival = (departMs: number, route: Route) => departMs + (minutes(route.durationSec) + commute.extraMin) * MIN;
  const fastestArrival = (departMs: number, routes: Route[]) => Math.min(...routes.map((r) => arrival(departMs, r)));
  const nearestTo = (ms: number) =>
    departures.reduce((a, b) => (Math.abs(b.departMs - ms) < Math.abs(a.departMs - ms) ? b : a));

  // The latest sampled departure whose fastest route arrives inside the buffer.
  const leaveBy = departures
    .filter((d) => fastestArrival(d.departMs, d.routes) <= onTimeByMs)
    .reduce<number | null>((latest, d) => (latest === null || d.departMs > latest ? d.departMs : latest), null);

  // Leave at leave-by while it is ahead; otherwise now, in the traffic of the sample nearest now.
  const departMs = leaveBy !== null && leaveBy > nowMs ? leaveBy : nowMs;
  const views = nearestTo(departMs).routes.map((r) => {
    const arriveMs = arrival(departMs, r);
    return {
      id: r.id,
      label: r.label,
      durationMin: minutes(r.durationSec),
      trafficDelayMin: Math.max(0, minutes(r.durationSec - r.staticDurationSec)),
      arriveMs,
      arriveAt: iso(arriveMs),
      deltaMin: (arriveMs - deadlineMs) / MIN,
      deltaKind: arriveMs <= onTimeByMs ? 'early' : arriveMs <= deadlineMs ? 'tight' : 'late',
      polyline: r.polyline,
    } as const;
  });

  // Earliest arrival; a tie goes to the smaller traffic delay.
  const best = views.reduce((a, b) =>
    b.arriveMs < a.arriveMs || (b.arriveMs === a.arriveMs && b.trafficDelayMin < a.trafficDelayMin) ? b : a,
  );
  const selected = views.find((v) => v.id === selectedRouteId) ?? best;
  const eta = selected.arriveMs;
  const state = eta <= onTimeByMs ? 'on_time' : eta <= deadlineMs ? 'at_risk' : 'late';
  const lateMin = Math.max(0, (eta - deadlineMs) / MIN);

  // Leaving at the usual time, in the traffic of the sample nearest it. Left out once that time has passed.
  const usualMs = Date.parse(nairobiTimeOnDay(commute.usualDeparture, new Date(deadlineMs)));
  const usualArriveMs = fastestArrival(usualMs, nearestTo(usualMs).routes);

  const remindMs = leaveBy === null ? null : leaveBy - REMIND_BEFORE_MIN * MIN;
  const routes: RouteView[] = views.map(({ arriveMs, ...view }) => ({
    ...view,
    recommended: view.id === best.id,
    selected: view.id === selected.id,
  }));
  return {
    state,
    now: iso(nowMs),
    departAt: iso(departMs),
    leaveBy: leaveBy === null ? null : iso(leaveBy),
    remindAt: remindMs !== null && remindMs > nowMs ? iso(remindMs) : null,
    eta: iso(eta),
    lateMin,
    lateMinRounded: Math.ceil(lateMin / LATENESS_STEP_MIN) * LATENESS_STEP_MIN,
    usual:
      usualMs < nowMs
        ? null
        : { departAt: iso(usualMs), arriveAt: iso(usualArriveMs), lateMin: Math.max(0, (usualArriveMs - deadlineMs) / MIN) },
    routes,
    betterRouteId: state !== 'on_time' && best.arriveMs <= onTimeByMs ? best.id : null,
    noRouteOnTime: best.arriveMs > onTimeByMs,
    simulated: false,
    simulationLabel: null,
  };
}
