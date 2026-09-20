import { NextResponse } from "next/server";
import { z } from "zod";

import { type ApiError, RoutesRequest, RoutesResponse } from "@/lib/contract";
import { fetchSamples } from "@/lib/route-samples";
import { rainForecast } from "@/lib/weather";

const fail = (error: string, status: number) => NextResponse.json<ApiError>({ error }, { status });

// Each check costs about 6 Google calls, so a commute's response is reused for a few minutes.
// In memory: the backend is a single container.
const CACHE_MS = 3 * 60_000;
const cache = new Map<string, { expires: number; response: Promise<RoutesResponse> }>();

const commuteKey = ({ origin, destination, arriveBy, usualDeparture }: RoutesRequest) =>
  [origin.lat, origin.lng, destination.lat, destination.lng, Date.parse(arriveBy), Date.parse(usualDeparture)].join();

function cachedRoutes(req: RoutesRequest, apiKey: string): Promise<RoutesResponse> {
  const now = Date.now();
  for (const [key, entry] of cache) if (entry.expires <= now) cache.delete(key);

  const key = commuteKey(req);
  const hit = cache.get(key);
  if (hit) return hit.response;

  const fetchedAt = new Date(now);
  // The forecast rides along with the routes and never fails them: no forecast is simply no rain.
  const response = Promise.all([fetchSamples(req, apiKey, fetchedAt), rainForecast(req, fetchedAt)]).then(
    ([{ samples, complete }, rain]) => {
      if (!complete) cache.delete(key); // missing samples are fetched again next time
      return RoutesResponse.parse({ fetchedAt: fetchedAt.toISOString(), samples, ...(rain ? { rain } : {}) });
    },
  );
  cache.set(key, { expires: now + CACHE_MS, response });
  response.catch(() => cache.delete(key)); // a failure is not cached
  return response;
}

// POST /api/routes: RoutesRequest → RoutesResponse, about 6 departure samples and whether rain is forecast around
// the drive. Responses cached per commute.
export async function POST(request: Request) {
  const parsed = RoutesRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(`Invalid request. ${z.prettifyError(parsed.error)}`, 400);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return fail("GOOGLE_MAPS_API_KEY is not set on the backend.", 500);

  try {
    return NextResponse.json(await cachedRoutes(parsed.data, apiKey));
  } catch (e) {
    console.error("POST /api/routes", e);
    // 503, not 502: Cloudflare in front of Coolify swaps an origin 502 body for its own page.
    return fail(e instanceof Error ? e.message : "Could not fetch routes.", 503);
  }
}
