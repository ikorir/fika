// Driving has no arrive-by in the Routes API, so the app searches for a leave-by time across several departures.
// This picks those departures and fetches them in parallel. No decision logic: the app's commute engine decides.
import type { RoutesRequest, Sample } from "@/lib/contract";
import { computeRoutes } from "@/lib/google-routes";

const MIN = 60_000;
// Steps back from the deadline. 15 min before it is skipped: the default buffer and extra minutes (10 + 5) already
// use it up, so it could never be a leave-by. Four steps plus "now" and the usual departure make about 6 samples.
const STEPS_BEFORE_DEADLINE_MIN = [30, 45, 60, 75];
// Google rejects departure times in the past; anything this close to now is covered by the "now" sample.
const FUTURE_MARGIN_MS = 2 * MIN;
// A step this close to the usual departure is left to the usual sample.
const SAME_DEPARTURE_MS = 5 * MIN;

type Departure = { departAt: Date; kind: Sample["kind"] };

function departures(req: RoutesRequest, now: Date): Departure[] {
  const future = (d: Date) => d.getTime() > now.getTime() + FUTURE_MARGIN_MS;
  const deadline = Date.parse(req.arriveBy);
  const usual = new Date(req.usualDeparture);
  const list: Departure[] = [{ departAt: now, kind: "now" }];
  if (future(usual)) list.push({ departAt: usual, kind: "usual" });
  for (const min of STEPS_BEFORE_DEADLINE_MIN) {
    const step = new Date(deadline - min * MIN);
    if (future(step) && Math.abs(step.getTime() - usual.getTime()) >= SAME_DEPARTURE_MS)
      list.push({ departAt: step, kind: "step" });
  }
  return list.sort((a, b) => a.departAt.getTime() - b.departAt.getTime());
}

/**
 * Routes for "now", the usual departure and steps back from the deadline, in departure order. Past times are
 * left out. A departure whose Google call fails is dropped; this throws only when every call fails.
 */
export async function fetchSamples(req: RoutesRequest, apiKey: string, now: Date): Promise<Sample[]> {
  const planned = departures(req, now);
  const results = await Promise.allSettled(
    planned.map(({ departAt, kind }) =>
      computeRoutes(
        { origin: req.origin, destination: req.destination, departAt: kind === "now" ? undefined : departAt },
        apiKey,
      ),
    ),
  );
  const samples: Sample[] = [];
  results.forEach((result, i) => {
    const { departAt, kind } = planned[i];
    if (result.status === "fulfilled") samples.push({ departAt: departAt.toISOString(), kind, routes: result.value });
    else console.error(`Google Routes, ${kind} sample at ${departAt.toISOString()}`, result.reason);
  });
  if (samples.length === 0) {
    const first = results.find((r) => r.status === "rejected");
    throw first?.reason instanceof Error ? first.reason : new Error("Could not fetch routes.");
  }
  return samples;
}
