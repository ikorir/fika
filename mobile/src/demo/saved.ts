// The demo's own data, bundled into the app so the stage arc survives venue wifi, Google or Claude failing:
// one real routes response for the seeded commute, and Claude's words for every step of the script in every
// tone and language. Both were captured from the backend against live Google and Claude — see scripts/demo-data.ts,
// which regenerates them and is the only thing that should ever write these two files.
import type { Commute, DraftRequest, DraftResponse, Evaluation, RoutesResponse, Sample, Simulation } from '@/contract';
import { accident, midTrip, startingPoint } from '@/demo/presets';
import drafts from '@/demo/saved-drafts.json';
import routes from '@/demo/saved-routes.json';
import { evaluate } from '@/engine';

/** The saved response "Use saved routes" puts in place of a live fetch. Real Google numbers, simply not current. */
export const savedRoutes = routes as RoutesResponse;

const savedDrafts = drafts as Record<string, DraftResponse>;

/** The steps of the five-minute script the words are saved for. */
export const SCENARIOS = ['on_time', 'at_risk', 'switched', 'late'] as const;
export type Scenario = (typeof SCENARIOS)[number];

/**
 * Which step of the script a set of facts belongs to. The state says almost all of it; the one thing it does not
 * is the difference between the opening screen and the same "on time" after the presenter has switched away from
 * the accident, where the words have another road to name and a delay to explain.
 */
export function scenarioOf(req: DraftRequest): Scenario {
  if (req.state !== 'on_time') return req.state;
  return req.facts.cause ? 'switched' : 'on_time';
}

/** How a draft is filed: the step of the script, and the voice it was written in. */
export const savedKey = (req: DraftRequest) => `${scenarioOf(req)}:${req.tone}:${req.language}`;

/**
 * Claude's words for this screen, written ahead of the demo and bundled. Undefined when nothing was saved for
 * these facts, and then the app falls back to its own template exactly as it does when the backend is unreachable.
 */
export const savedDraft = (req: DraftRequest): DraftResponse | undefined => savedDrafts[savedKey(req)];

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
