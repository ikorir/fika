// What the Today screen says, worded from an Evaluation. No commute decisions here: the engine makes them.
// The decision line and conditions note are a fixed English template until Claude writes them (#7).
import type { Commute, Evaluation, RouteView } from '@/contract';
import { formatTime, nairobiTimeOnDay } from '@/time';

const MIN = 60_000;

/** "via Waiyaki Way" → "Waiyaki Way". */
export const routeName = (route: RouteView) => route.label.replace(/^via /, '');

const selectedRoute = (e: Evaluation) => e.routes.find((r) => r.selected)!;
const recommendedRoute = (e: Evaluation) => e.routes.find((r) => r.recommended)!;
export const leavingNow = (e: Evaluation) => e.departAt === e.now;
/** Already driving, in Demo mode's mid-trip: the departure is behind the clock. */
const onTheRoad = (e: Evaluation) => Date.parse(e.departAt) < Date.parse(e.now);

/** Over the route list: "leaving now, 7:45", "leaving 8:05", or "left 8:20" once on the road. */
export function departureCaption(e: Evaluation): string {
  if (leavingNow(e)) return `leaving now, ${formatTime(e.departAt)}`;
  return `${onTheRoad(e) ? 'left' : 'leaving'} ${formatTime(e.departAt)}`;
}

/** The route that restores on time, which the engine names in betterRouteId. */
export const betterRoute = (e: Evaluation) => e.routes.find((r) => r.id === e.betterRouteId) ?? null;

/** The minutes until leaving, or "tomorrow" when that is on another Nairobi day. */
function untilLeaving(e: Evaluation): string {
  const now = new Date(e.now);
  if (nairobiTimeOnDay('00:00', new Date(e.departAt)) !== nairobiTimeOnDay('00:00', now)) return 'tomorrow';
  const min = Math.round((Date.parse(e.departAt) - now.getTime()) / MIN);
  if (min < 60) return `in ${min} min`;
  return min % 60 ? `in ${Math.floor(min / 60)} h ${min % 60} min` : `in ${min / 60} h`;
}

export type HeroText = { label: string; value: string; primary: string; secondary: string };

/**
 * "Leave by 8:05 · in 25 min · arrive 8:50", "Leave Now · arrive 8:55 · 5 min inside your buffer", "Arriving 9:15 ·
 * 15 min late · via Waiyaki Way". Once on the road it is "Arriving" whatever the state.
 */
export function heroText(e: Evaluation, commute: Commute): HeroText {
  const selected = selectedRoute(e);
  const arrive = `arrive ${formatTime(e.eta)}`;
  const standing =
    e.state === 'late'
      ? `${e.lateMin} min late`
      : e.state === 'at_risk'
        ? `${selected.deltaMin + commute.bufferMin} min inside your buffer`
        : `${-selected.deltaMin} min early`;
  if (e.state === 'late' || onTheRoad(e))
    return { label: 'Arriving', value: formatTime(e.eta), primary: standing, secondary: `via ${routeName(selected)}` };
  if (!leavingNow(e)) return { label: 'Leave by', value: formatTime(e.departAt), primary: untilLeaving(e), secondary: arrive };
  return { label: 'Leave', value: 'Now', primary: arrive, secondary: standing };
}

/**
 * "It's past your 8:00 leave-by." once leave-by has gone by and leaving now no longer arrives on time. While it still
 * does, leave-by was only the last sampled time that worked, so the screen just says to leave now. Not once on the
 * road (Demo mode's mid-trip), where there is no leaving left to do.
 */
export function pastLeaveBy(e: Evaluation): string | null {
  if (e.state === 'on_time' || onTheRoad(e) || !e.leaveBy || Date.parse(e.leaveBy) >= Date.parse(e.now)) return null;
  return `It's past your ${formatTime(e.leaveBy)} leave-by.`;
}

export function decisionLine(e: Evaluation, commute: Commute): string {
  const selected = selectedRoute(e);
  const better = betterRoute(e);
  const eta = formatTime(e.eta);
  const usual = !e.usual
    ? ''
    : e.usual.departAt === e.departAt
      ? " That's your usual time."
      : ` Your usual ${formatTime(e.usual.departAt)} gets you there at ${formatTime(e.usual.arriveAt)}.`;
  const lead = leavingNow(e) ? 'Leave now' : `Leave by ${formatTime(e.departAt)}`;

  if (onTheRoad(e) && e.state !== 'late')
    return `You will reach ${commute.destination.label} around ${eta}, ${e.state === 'on_time' ? 'on time' : 'inside your buffer'}.`;

  if (e.state === 'on_time') return `${lead} via ${routeName(selected)} to arrive at ${eta}.${usual}`;

  const switchBack = better && `switch to ${routeName(better)} and arrive at ${formatTime(better.arriveAt)}, back on time`;

  if (e.state === 'at_risk') {
    if (switchBack) return `${lead}, or ${switchBack}.`;
    return `${lead} to arrive at ${eta}, inside your buffer. ${
      e.routes.length > 1 ? 'No other route gets you there on time.' : 'This is the only route found.'
    }`;
  }

  const lateness = `You will reach ${commute.destination.label} around ${eta}, ${e.lateMin} min past your deadline.`;
  if (switchBack) return `${lateness} Or ${switchBack}.`;
  return `${lateness} Let ${commute.contact.name} know now, before you are late.`;
}

/** What the one-off reminder says once it goes off: the leave-by it was asked for. */
export function reminderBody(e: Evaluation): string {
  if (!e.leaveBy) return 'See what traffic is doing before you leave.';
  return `Leave by ${formatTime(e.leaveBy)} to arrive at ${formatTime(e.eta)}.`;
}

/** Which route is slower than normal, or, when late, that no route gets there on time. */
export function conditionsNote(e: Evaluation): string {
  if (e.state === 'late' && e.noRouteOnTime)
    return `No ${e.routes.length > 1 ? 'other ' : ''}route gets you there on time.`;
  const selected = selectedRoute(e);
  return selected.trafficDelayMin > 0
    ? `${routeName(selected)} is ${selected.trafficDelayMin} min slower than normal.`
    : `Traffic on ${routeName(selected)} is normal.`;
}
