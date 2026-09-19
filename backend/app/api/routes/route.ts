import { NextResponse } from "next/server";
import { z } from "zod";

import { type ApiError, RoutesRequest, RoutesResponse } from "@/lib/contract";
import { computeRoutes } from "@/lib/google-routes";

const fail = (error: string, status: number) => NextResponse.json<ApiError>({ error }, { status });

// POST /api/routes: RoutesRequest → RoutesResponse. For now a single "now" sample.
export async function POST(request: Request) {
  const parsed = RoutesRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(`Invalid request. ${z.prettifyError(parsed.error)}`, 400);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return fail("GOOGLE_MAPS_API_KEY is not set on the backend.", 500);

  const { origin, destination } = parsed.data;
  const fetchedAt = new Date().toISOString();
  try {
    const routes = await computeRoutes({ origin, destination }, apiKey);
    return NextResponse.json(
      RoutesResponse.parse({ fetchedAt, samples: [{ departAt: fetchedAt, kind: "now", routes }] }),
    );
  } catch (e) {
    console.error("POST /api/routes", e);
    // 503, not 502: Cloudflare in front of Coolify swaps an origin 502 body for its own page.
    return fail(e instanceof Error ? e.message : "Could not fetch routes.", 503);
  }
}
