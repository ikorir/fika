// The demo's own data, bundled into the app so the stage arc survives venue wifi, Google or Claude failing:
// one real routes response for the seeded commute, and Claude's words for every step of the script in every
// tone and language. Both were captured from the backend against live Google and Claude — see scripts/demo-data.ts,
// which regenerates them and is the only thing that should ever write these two files.
import type { Commute, DraftRequest, DraftResponse, Evaluation, RoutesResponse, Sample, Simulation } from '@/contract';
import { accident, midTrip, startingPoint } from '@/demo/presets';
import drafts from '@/demo/saved-drafts.json';
import routes from '@/demo/saved-routes.json';
import { evaluate } from '@/engine';
import { seedCommute } from '@/seed';

/**
 * The commute the saved response was fetched for. The two go together: the routes run from its origin to its
 * destination, the arc holds against its deadline, and the saved words name its contact. While saved routes are on
 * the screen shows this commute, whatever the phone has stored, and the stored one is left alone.
 */
export const savedCommute = seedCommute;

/** The saved response "Use saved routes" puts in place of a live fetch. Real Google numbers, simply not current. */
export const savedRoutes = routes as RoutesResponse;

/** The steps of the five-minute script the words are saved for. */
export type Scenario = 'on_time' | 'at_risk' | 'switched' | 'late';

// Each draft is filed under the whole request it was written for, which is how useDraft keys Claude's live answers
// too. Words are about facts: a saved line that says "arrive at 8:49 via Nairobi Expressway" is wrong the moment
// the presenter picks another road, so anything off the script finds nothing here.
const savedDrafts = new Map(
  (drafts as { request: DraftRequest; words: DraftResponse }[]).map((d) => [JSON.stringify(d.request), d.words]),
);

/**
 * Claude's words for exactly these facts, written ahead of the demo and bundled. Undefined for any other facts —
 * another road, another clock, another contact — and then the app uses its own template, exactly as it does when
 * the backend is unreachable.
 */
export const savedDraft = (req: DraftRequest): DraftResponse | undefined => savedDrafts.get(JSON.stringify(req));

/** One screen of the script: what the engine makes of it, and the simulation that got there. */
export type Step = { scenario: Scenario; evaluation: Evaluation; simulation: Simulation; selectedRouteId: string };

/**
 * The screens the five-minute script goes through, in order: on time, the accident, the switch back on time, and
 * the trip already under way. Written down here because two things have to agree about them — the generator that
 * asks Claude for the words, and the test that checks every step has some.
 */
export function scriptSteps(commute: Commute, samples: Sample[], now = new Date()): Step[] {
  const at = (simulation: Simulation, selectedRouteId: string) =>
    evaluate({ commute, samples, now, selectedRouteId, simulation });

  const live = evaluate({ commute, samples, now });
  const route = live.routes.find((r) => r.selected)!;
  const start = startingPoint(live);
  const atRisk = { ...start, delay: accident(route) };
  const onTheRoad = { ...atRisk, ...midTrip(commute, samples, route.id, atRisk.delay) };
  // The road the at-risk screen offers to switch to; without one, the switch is not part of this fixture's script.
  const better = at(atRisk, route.id).betterRouteId ?? route.id;

  return [
    { scenario: 'on_time', simulation: start, selectedRouteId: route.id },
    { scenario: 'at_risk', simulation: atRisk, selectedRouteId: route.id },
    { scenario: 'switched', simulation: atRisk, selectedRouteId: better },
    { scenario: 'late', simulation: onTheRoad, selectedRouteId: route.id },
  ].map((s) => ({ ...s, evaluation: at(s.simulation, s.selectedRouteId) }) as Step);
}
