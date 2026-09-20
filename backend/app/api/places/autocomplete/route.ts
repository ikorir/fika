import { NextResponse } from "next/server";

import { type ApiError, PlaceSuggestions } from "@/lib/contract";
import { autocomplete } from "@/lib/google-places";

const fail = (error: string, status: number) => NextResponse.json<ApiError>({ error }, { status });

// One letter matches half of Nairobi, and every call is billed, so the search waits for something to go on.
const MIN_QUERY = 2;

// GET /api/places/autocomplete?q=… → PlaceSuggestions. Kenya only; the key stays on the backend.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < MIN_QUERY) return NextResponse.json<PlaceSuggestions>({ suggestions: [] });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return fail("GOOGLE_MAPS_API_KEY is not set on the backend.", 500);

  try {
    const found = PlaceSuggestions.safeParse({ suggestions: await autocomplete(q, apiKey) });
    if (!found.success) {
      console.error("GET /api/places/autocomplete", found.error);
      return fail("Could not search for places.", 503);
    }
    return NextResponse.json(found.data);
  } catch (e) {
    console.error("GET /api/places/autocomplete", e);
    // 503, not 502: Cloudflare in front of Coolify swaps an origin 502 body for its own page.
    return fail(e instanceof Error ? e.message : "Could not search for places.", 503);
  }
}
