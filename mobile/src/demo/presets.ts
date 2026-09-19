// Demo mode's presets, as the Simulation the engine applies on top of the real routes. Demo state lives in memory only.
import type { Commute, Evaluation, RouteView, Sample, Simulation } from '@/contract';
import { usualDeparture } from '@/engine';
import { routeName } from '@/today/words';

const MIN = 60_000;
export const ACCIDENT_MIN = 25;
const MID_TRIP_MIN = 20;
const START_BEFORE_LEAVE_BY_MIN = 20;

/** The instant `min` minutes after `iso` (before it when negative). */
export const minutesLater = (iso: string, min: number) => new Date(Date.parse(iso) + min * MIN).toISOString();

/**
 * Where Demo mode starts, from the live evaluation: the clock 20 min before leave-by on the commute's day, so the
 * screen is on time and the reminder is two 5-minute steps away. With no leave-by, the real clock.
 */
export function startingPoint(live: Evaluation): Simulation {
  return live.leaveBy ? { clock: minutesLater(live.leaveBy, -START_BEFORE_LEAVE_BY_MIN) } : {};
}

/** "Accident on Waiyaki Way": 25 min more on the route, in every sample. */
export function accident(route: RouteView): NonNullable<Simulation['delay']> {
  return { routeId: route.id, addMin: ACCIDENT_MIN, cause: `Accident on ${routeName(route)}` };
}

/**
 * On the road: left at the usual departure and the clock 20 min later. The trip is on the accident's route while
 * there is one, the route the late notice names, even after the presenter has switched; otherwise the route shown.
 */
export function midTrip(
  commute: Commute,
  samples: Sample[],
  shownRouteId: string,
  delay?: Simulation['delay'],
): Required<Pick<Simulation, 'clock' | 'midTrip'>> {
  const departedAt = usualDeparture(commute, samples);
  return { clock: minutesLater(departedAt, MID_TRIP_MIN), midTrip: { routeId: delay?.routeId ?? shownRouteId, departedAt } };
}
