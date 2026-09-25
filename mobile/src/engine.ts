// The commute engine: every commute decision the screen shows, from the commute, the route samples and the clock.
// Pure: no I/O, the clock is passed in. See SPEC.md → Technical Contract → Commute engine.
import type { Commute, Evaluation, Route, RouteView, Sample, Simulation } from '@/contract';
import { commuteDeadline, formatTime, nairobiTimeOnDay } from '@/time';

const MIN = 60_000;
const REMIND_BEFORE_MIN = 10;
const LATENESS_STEP_MIN = 5;

/** Whole minutes throughout, so every number on screen adds up: leaving 8:05 + 40 min + 5 extra = 8:50. */
const floorToMinute = (ms: number) => Math.floor(ms / MIN) * MIN;
const minutes = (sec: number) => Math.round(sec / 60);
const iso = (ms: number) => new Date(ms).toISOString();

// The selected route's delta kind is the screen's state.
const STATE_OF = { early: 'on_time', tight: 'at_risk', late: 'late' } as const satisfies Record<
  RouteView['deltaKind'],
  Evaluation['state']
>;

/** An instant as ISO or as epoch milliseconds. */
type Instant = string | number;
const msOf = (t: Instant) => (typeof t === 'number' ? t : Date.parse(t));

/**
 * How an arrival stands against the deadline: early when it is in by the deadline less the buffer, tight when it is
 * in by the deadline, late after it. `extraMin` (parking, pickup wait) is added to the arrival first; leave it out
 * for an arrival that already counts it, as every arrival the engine works out does.
 */
export function deltaKind(arriveAt: Instant, deadline: Instant, bufferMin: number, extraMin = 0): RouteView['deltaKind'] {
  const arriveMs = msOf(arriveAt) + extraMin * MIN;
  const deadlineMs = msOf(deadline);
  if (arriveMs <= deadlineMs - bufferMin * MIN) return 'early';
  return arriveMs <= deadlineMs ? 'tight' : 'late';
}

type Input = { commute: Commute; samples: Sample[]; now: Date; selectedRouteId?: string; simulation?: Simulation };
type Departure = { departMs: number; routes: Route[] };

/** Needs at least one sample with a route; throws otherwise. */
export function evaluate({ commute, samples, now, selectedRouteId, simulation = {} }: Input): Evaluation {
  // Demo mode's simulation goes on top of the real routes before anything else is worked out.
  const { delay, clock, midTrip } = simulation;
  const delayed = (r: Route) =>
    r.id === delay?.routeId ? { ...r, durationSec: r.durationSec + delay.addMin * 60 } : r;

  const nowMs = floorToMinute(clock ? Date.parse(clock) : now.getTime());
  const departures: Departure[] = samples
    .filter((s) => s.routes.length > 0)
    .map((s) => ({ departMs: floorToMinute(Date.parse(s.departAt)), routes: s.routes.map(delayed) }));
  if (departures.length === 0) throw new Error('evaluate() needs at least one sample with a route.');

  const deadlineMs = deadlineOf(commute, samples);
  const onTimeByMs = deadlineMs - commute.bufferMin * MIN;
  const kindOf = (arriveMs: number) => deltaKind(arriveMs, deadlineMs, commute.bufferMin);

  const arrival = (departMs: number, route: Route) => departMs + (minutes(route.durationSec) + commute.extraMin) * MIN;
  const fastestArrival = (departMs: number, routes: Route[]) => Math.min(...routes.map((r) => arrival(departMs, r)));
  const nearestTo = (ms: number) =>
    departures.reduce((a, b) => (Math.abs(b.departMs - ms) < Math.abs(a.departMs - ms) ? b : a));

  // The latest sampled departure whose fastest route arrives inside the buffer.
  const leaveBy = departures
    .filter((d) => fastestArrival(d.departMs, d.routes) <= onTimeByMs)
    .reduce<number | null>((latest, d) => (latest === null || d.departMs > latest ? d.departMs : latest), null);

  // Leave at leave-by while it is ahead; otherwise now, in the traffic of the sample nearest now.
  // Mid-trip (Demo mode), the departure is the one already made.
  const departMs = midTrip
    ? floorToMinute(Date.parse(midTrip.departedAt))
    : leaveBy !== null && leaveBy > nowMs
      ? leaveBy
      : nowMs;

  // On the road: the share of the trip still ahead at the clock, driven in the traffic of the sample nearest the clock.
  const onTheRoad = (r: Route) => {
    const plannedMin = minutes(r.durationSec);
    const drivenMin = (nowMs - departMs) / MIN;
    if (drivenMin <= 0 || drivenMin >= plannedMin) return arrival(departMs, r);
    const current = nearestTo(nowMs).routes.find((c) => c.id === r.id) ?? r;
    return nowMs + (Math.round((1 - drivenMin / plannedMin) * minutes(current.durationSec)) + commute.extraMin) * MIN;
  };

  const views = nearestTo(departMs).routes.map((r) => {
    const arriveMs = r.id === midTrip?.routeId ? onTheRoad(r) : arrival(departMs, r);
    return {
      id: r.id,
      label: r.label,
      durationMin: minutes(r.durationSec),
      trafficDelayMin: Math.max(0, minutes(r.durationSec - r.staticDurationSec)),
      arriveMs,
      arriveAt: iso(arriveMs),
      deltaMin: (arriveMs - deadlineMs) / MIN,
      deltaKind: kindOf(arriveMs),
      polyline: r.polyline,
      ...(r.toll && { toll: r.toll }),
    };
  });

  // Earliest arrival; a tie goes to the smaller traffic delay.
  const best = views.reduce((a, b) =>
    b.arriveMs < a.arriveMs || (b.arriveMs === a.arriveMs && b.trafficDelayMin < a.trafficDelayMin) ? b : a,
  );
  const selected = views.find((v) => v.id === (midTrip?.routeId ?? selectedRouteId)) ?? best;
  const eta = selected.arriveMs;
  const state = STATE_OF[kindOf(eta)];
  const lateMin = Math.max(0, (eta - deadlineMs) / MIN);

  // Leaving at the usual time, in the traffic of the sample nearest it. Left out once that time has passed.
  const usualMs = Date.parse(usualDeparture(commute, samples));
  const usualArriveMs = fastestArrival(usualMs, nearestTo(usualMs).routes);

  // What the banner says is simulated: "Waiyaki Way +25 min · Clock set to 8:40". The clock covers a trip under way.
  const simulationParts = [
    delay && `${roadName(delay.routeId, samples)} +${delay.addMin} min`,
    clock && `Clock set to ${formatTime(clock)}`,
    midTrip && !clock && `Left at ${formatTime(midTrip.departedAt)}`,
  ].filter((part) => !!part);

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
    // Nothing to switch to once on the road.
    betterRouteId: !midTrip && state !== 'on_time' && best.arriveMs <= onTimeByMs ? best.id : null,
    noRouteOnTime: best.arriveMs > onTimeByMs,
    simulated: simulationParts.length > 0,
    simulationLabel: simulationParts.length > 0 ? simulationParts.join(' · ') : null,
  };
}

/** The deadline the samples were fetched for, even if the clock has since moved on to tomorrow's. */
function deadlineOf(commute: Commute, samples: Sample[]): number {
  const fetchedMs = Math.min(...samples.filter((s) => s.routes.length > 0).map((s) => Date.parse(s.departAt)));
  return Date.parse(commuteDeadline(commute.arriveBy, new Date(fetchedMs)));
}

/** The usual departure on the deadline's day, as ISO: where Demo mode's mid-trip leaves from. */
export function usualDeparture(commute: Commute, samples: Sample[]): string {
  return iso(Date.parse(nairobiTimeOnDay(commute.usualDeparture, new Date(deadlineOf(commute, samples)))));
}

/** "Waiyaki Way" for waiyaki-way, as the samples name it. */
function roadName(routeId: string, samples: Sample[]): string {
  const route = samples.flatMap((s) => s.routes).find((r) => r.id === routeId);
  return route ? route.label.replace(/^via /, '') : routeId;
}
