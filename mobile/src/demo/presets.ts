// Demo mode's presets, as the Simulation the engine applies on top of the real routes. Demo state lives in memory only.
import type { RouteView, Simulation } from '@/contract';

export const ACCIDENT_MIN = 25;

const routeName = (route: RouteView) => route.label.replace(/^via /, '');

/** "Accident on Waiyaki Way": 25 min more on the route, in every sample. */
export function accident(route: RouteView): NonNullable<Simulation['delay']> {
  return { routeId: route.id, addMin: ACCIDENT_MIN, cause: `Accident on ${routeName(route)}` };
}
