// Demo mode's presets, as the Simulation the engine applies on top of the real routes. Demo state lives in memory only.
import type { Commute, Evaluation, RouteView, Sample, Simulation } from '@/contract';
import { commuteDeadline, nairobiTimeOnDay } from '@/time';

const MIN = 60_000;
export const ACCIDENT_MIN = 25;
const MID_TRIP_MIN = 20;
const START_BEFORE_LEAVE_BY_MIN = 20;

const routeName = (route: RouteView) => route.label.replace(/^via /, '');
const later = (iso: string, min: number) => new Date(Date.parse(iso) + min * MIN).toISOString();

/**
 * Where Demo mode starts, from the live evaluation: the clock 20 min before leave-by on the commute's day, so the
 * screen is on time and the reminder is two 5-minute steps away. With no leave-by, the real clock.
 */
export function start(live: Evaluation): Simulation {
  return live.leaveBy ? { clock: later(live.leaveBy, -START_BEFORE_LEAVE_BY_MIN) } : {};
}

/** "Accident on Waiyaki Way": 25 min more on the route, in every sample. */
export function accident(route: RouteView): NonNullable<Simulation['delay']> {
  return { routeId: route.id, addMin: ACCIDENT_MIN, cause: `Accident on ${routeName(route)}` };
}

/** On the road: left at the usual departure on the route, and the clock 20 min later. */
export function midTrip(
  commute: Commute,
  samples: Sample[],
  routeId: string,
): Required<Pick<Simulation, 'clock' | 'midTrip'>> {
  // The usual departure on the day evaluate() judges the samples against: the deadline they were fetched for.
  const fetchedAt = new Date(Math.min(...samples.map((s) => Date.parse(s.departAt))));
  const deadline = new Date(commuteDeadline(commute.arriveBy, fetchedAt));
  const departedAt = new Date(nairobiTimeOnDay(commute.usualDeparture, deadline)).toISOString();
  return { clock: later(departedAt, MID_TRIP_MIN), midTrip: { routeId, departedAt } };
}
