// The commute engine: every commute decision the screen shows, from the commute, the route samples and the clock.
// Pure: no I/O, the clock is passed in. See SPEC.md → Technical Contract → Commute engine.
import type { Commute, Evaluation, Route, RouteView, Sample } from '@/contract';
import { commuteDeadline, nairobiTimeOnDay } from '@/time';

const MIN = 60_000;
const REMIND_BEFORE_MIN = 10;

/** Whole minutes throughout, so every number on screen adds up: leaving 8:05 + 40 min + 5 extra = 8:50. */
const floorToMinute = (ms: number) => Math.floor(ms / MIN) * MIN;
const minutes = (sec: number) => Math.round(sec / 60);
const iso = (ms: number) => new Date(ms).toISOString();

type Input = { commute: Commute; samples: Sample[]; now: Date; selectedRouteId?: string };

export function evaluate({ commute, samples, now }: Input): Evaluation {
  const nowMs = floorToMinute(now.getTime());
  const deadlineMs = Date.parse(commuteDeadline(commute.arriveBy, now));
  const onTimeByMs = deadlineMs - commute.bufferMin * MIN;

  const arrival = (departMs: number, route: Route) => departMs + (minutes(route.durationSec) + commute.extraMin) * MIN;
  const departures = samples
    .filter((s) => s.routes.length > 0)
    .map((s) => ({ departMs: floorToMinute(Date.parse(s.departAt)), routes: s.routes }));
  const bestArrival = ({ departMs, routes }: (typeof departures)[number]) =>
    Math.min(...routes.map((r) => arrival(departMs, r)));

  const leaveBy = departures
    .filter((d) => bestArrival(d) <= onTimeByMs)
    .reduce<number | null>((latest, d) => (latest === null || d.departMs > latest ? d.departMs : latest), null);

  // Leave at leave-by while it is ahead; otherwise now, in the traffic of the sample nearest now.
  const departMs = leaveBy !== null && leaveBy > nowMs ? leaveBy : nowMs;
  const nearestTo = (ms: number) =>
    departures.reduce((a, b) => (Math.abs(b.departMs - ms) < Math.abs(a.departMs - ms) ? b : a));

  const routes: RouteView[] = nearestTo(departMs).routes.map((r) => ({
    id: r.id,
    label: r.label,
    durationMin: minutes(r.durationSec),
    trafficDelayMin: 0,
    arriveAt: iso(arrival(departMs, r)),
    deltaMin: 0,
    deltaKind: 'early',
    recommended: false,
    selected: false,
    polyline: r.polyline,
  }));
  const eta = Math.min(...routes.map((r) => Date.parse(r.arriveAt)));

  // Leaving at the usual time, in the traffic of the sample nearest it. Left out once that time has passed.
  const usualMs = Date.parse(nairobiTimeOnDay(commute.usualDeparture, new Date(deadlineMs)));
  const usualArriveMs = Math.min(...nearestTo(usualMs).routes.map((r) => arrival(usualMs, r)));
  const usual =
    usualMs < nowMs
      ? null
      : { departAt: iso(usualMs), arriveAt: iso(usualArriveMs), lateMin: Math.max(0, (usualArriveMs - deadlineMs) / MIN) };

  const remindMs = leaveBy === null ? null : leaveBy - REMIND_BEFORE_MIN * MIN;
  return {
    state: 'on_time',
    now: iso(nowMs),
    departAt: iso(departMs),
    leaveBy: leaveBy === null ? null : iso(leaveBy),
    remindAt: remindMs !== null && remindMs > nowMs ? iso(remindMs) : null,
    eta: iso(eta),
    lateMin: 0,
    lateMinRounded: 0,
    usual,
    routes,
    betterRouteId: null,
    noRouteOnTime: leaveBy === null,
    simulated: false,
    simulationLabel: null,
  };
}
