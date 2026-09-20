import { NextResponse } from "next/server";

import { type ApiError, Place } from "@/lib/contract";
import { placeDetails } from "@/lib/google-places";

const fail = (error: string, status: number) => NextResponse.json<ApiError>({ error }, { status });

// GET /api/places/details?placeId=… → Place, the one the app stores in the commute.
export async function GET(request: Request) {
  const placeId = new URL(request.url).searchParams.get("placeId")?.trim() ?? "";
  if (!placeId) return fail("A placeId is required.", 400);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return fail("GOOGLE_MAPS_API_KEY is not set on the backend.", 500);

  try {
    return NextResponse.json(Place.parse(await placeDetails(placeId, apiKey)));
  } catch (e) {
    console.error("GET /api/places/details", e);
    return fail(e instanceof Error ? e.message : "Could not look up that place.", 503);
  }
}
