// Driving has no arrive-by in the Routes API, so the app searches for a leave-by time across several departures.
// This picks those departures and fetches them in parallel. No decision logic: the app's commute engine decides.
import type { RoutesRequest, Sample } from "@/lib/contract";
import { computeRoutes } from "@/lib/google-routes";

const MIN = 60_000;
// Five steps, 15 min apart, back from the deadline. With "now" and the usual departure that makes about 6 samples.
const STEP_MIN = 15;
const STEPS = 5;
// The ladder starts 30 min before the deadline: the default buffer and extra minutes (10 + 5) use up the 15 min
// before it. A long commute starts it further back, about 30 min after the usual departure, so the leave-by it is
// looking for (near the usual departure) stays inside it.
const FIRST_STEP = 2;
const AFTER_USUAL_MIN = 30;
// Google rejects departure times in the past; anything this close to now is covered by the "now" sample.
const FUTURE_MARGIN_MS = 2 * MIN;
// A step this close to the usual departure is left to the usual sample.
const SAME_DEPARTURE_MS = 5 * MIN;

type Departure = { departAt: Date; kind: Sample["kind"] };

function departures(req: RoutesRequest, now: Date): Departure[] {
  const future = (ms: number) => ms > now.getTime() + FUTURE_MARGIN_MS;
  const deadline = Date.parse(req.arriveBy);
  const usual = Date.parse(req.usualDeparture);
  const sampledUsual = future(usual);
  const list: Departure[] = [{ departAt: now, kind: "now" }];
  if (sampledUsual) list.push({ departAt: new Date(usual), kind: "usual" });

  const first = Math.max(FIRST_STEP, Math.ceil((deadline - usual - AFTER_USUAL_MIN * MIN) / (STEP_MIN * MIN)));
  for (let k = first; k < first + STEPS; k++) {
    const step = deadline - k * STEP_MIN * MIN;
    if (future(step) && !(sampledUsual && Math.abs(step - usual) <= SAME_DEPARTURE_MS))
      list.push({ departAt: new Date(step), kind: "step" });
  }
  return list.sort((a, b) => a.departAt.getTime() - b.departAt.getTime());
}

/**
 * Routes for "now", the usual departure and steps back from the deadline, in departure order. Past times are
 * left out. A departure whose Google call fails is dropped (`complete` is then false); this throws only when
 * every call fails.
 */
export async function fetchSamples(
  req: RoutesRequest,
  apiKey: string,
  now: Date,
): Promise<{ samples: Sample[]; complete: boolean }> {
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
  return { samples, complete: samples.length === planned.length };
}
