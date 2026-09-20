// The demo's own data, bundled into the app so the stage arc survives venue wifi, Google or Claude failing.
// One real routes response for the seeded commute, captured from the backend on a weekday morning.
import type { RoutesResponse } from '@/contract';
import routes from '@/demo/saved-routes.json';

/** The saved response "Use saved routes" puts in place of a live fetch. Real Google numbers, simply not current. */
export const savedRoutes = routes as RoutesResponse;
