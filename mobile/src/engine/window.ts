// The departure window (W1, D8): every departure Fika checked, each with the best arrival its routes give, judged by
// the engine's own rule. Pure, like the engine: no I/O, no clock of its own.
import type { Commute, Evaluation, Route, RouteView, Sample, Simulation } from '@/contract';
import { deltaKind } from '@/engine';

const MIN = 60_000;

export type WindowBlock = {
  departAt: string; // ISO, to the minute, as the engine counts it
  arriveAt: string; // ISO: the best arrival leaving then, parking or pickup wait included
  route: string; // the label of the route that gets there first: "via Limuru Road"
  kind: RouteView['deltaKind'];
  chosen: boolean; // the departure the evaluation is for
};

// Counted as the engine counts them: departures to the minute, drives in whole minutes.
const floorToMinute = (ms: number) => Math.floor(ms / MIN) * MIN;
const minutes = (sec: number) => Math.round(sec / 60);

/**
 * The deadline an evaluation was made against, read back from its routes (each route's delta is its arrival less the
 * deadline), so the blocks are judged against exactly what the screen is.
 */
export function evaluationDeadline(evaluation: Evaluation): string {
  const route = evaluation.routes[0];
  return new Date(Date.parse(route.arriveAt) - route.deltaMin * MIN).toISOString();
}

/**
 * One block per distinct departure among the samples that have a route, earliest first. Each takes the best arrival
 * over that departure's routes (a tie goes to the smaller traffic delay, as in the engine), that route's label, and
 * its kind by `deltaKind()`. The block for `evaluation.departAt` is `chosen`. Pass the evaluation's `simulation` so
 * Demo mode's delay counts here as it does there.
 */
export function departureWindow(
  samples: Sample[],
  commute: Commute,
  evaluation: Evaluation,
  simulation?: Simulation,
): WindowBlock[] {
  const delay = simulation?.delay;
  const durationSec = (r: Route) => r.durationSec + (r.id === delay?.routeId ? delay.addMin * 60 : 0);
  const deadline = evaluationDeadline(evaluation);
  const chosenMs = Date.parse(evaluation.departAt);

  // Samples leaving in the same minute are one departure.
  const byDeparture = new Map<number, Route[]>();
  for (const s of samples) {
    if (s.routes.length === 0) continue;
    const departMs = floorToMinute(Date.parse(s.departAt));
    byDeparture.set(departMs, [...(byDeparture.get(departMs) ?? []), ...s.routes]);
  }

  return [...byDeparture]
    .sort(([a], [b]) => a - b)
    .map(([departMs, routes]) => {
      const options = routes.map((r) => ({
        route: r,
        arriveMs: departMs + (minutes(durationSec(r)) + commute.extraMin) * MIN,
        trafficDelayMin: Math.max(0, minutes(durationSec(r) - r.staticDurationSec)),
      }));
      const best = options.reduce((a, b) =>
        b.arriveMs < a.arriveMs || (b.arriveMs === a.arriveMs && b.trafficDelayMin < a.trafficDelayMin) ? b : a,
      );
      return {
        departAt: new Date(departMs).toISOString(),
        arriveAt: new Date(best.arriveMs).toISOString(),
        route: best.route.label,
        kind: deltaKind(best.arriveMs, deadline, commute.bufferMin),
        chosen: departMs === chosenMs,
      };
    });
}
