// Google Places API (New), Kenya only. A passthrough: it picks the fields the app's contract names and nothing else.
import type { Place, PlaceSuggestion } from "@/lib/contract";

const AUTOCOMPLETE = "https://places.googleapis.com/v1/places:autocomplete";
const DETAILS = "https://places.googleapis.com/v1/places";
const DETAILS_FIELD_MASK = "id,displayName,formattedAddress,location";
const REGION = "ke"; // Kenya only, as the Technical Contract says
const TIMEOUT_MS = 8_000;

type GoogleSuggestion = {
  placePrediction?: { placeId?: string; text?: { text?: string } };
};
type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
};

async function places<T>(url: string, init: RequestInit, apiKey: string): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, "X-Goog-Api-Key": apiKey },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!res.ok || !json) throw new Error(`Google Places ${res.status}: ${json?.error?.message ?? res.statusText}`);
  return json;
}

/** What the commuter is typing, as places to pick from. The label is the whole prediction, town and country included. */
export async function autocomplete(input: string, apiKey: string): Promise<PlaceSuggestion[]> {
  const json = await places<{ suggestions?: GoogleSuggestion[] }>(
    AUTOCOMPLETE,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input, includedRegionCodes: [REGION], regionCode: REGION }),
    },
    apiKey,
  );
  return (json.suggestions ?? []).flatMap(({ placePrediction: p }) =>
    p?.placeId && p.text?.text ? [{ placeId: p.placeId, label: p.text.text }] : [],
  );
}

/** The place the commuter picked. Its label is the short display name, which is what the Today screen shows. */
export async function placeDetails(placeId: string, apiKey: string): Promise<Place> {
  const json = await places<GooglePlace>(
    `${DETAILS}/${encodeURIComponent(placeId)}`,
    { method: "GET", headers: { "X-Goog-FieldMask": DETAILS_FIELD_MASK } },
    apiKey,
  );
  const { latitude, longitude } = json.location ?? {};
  if (typeof latitude !== "number" || typeof longitude !== "number")
    throw new Error("Google Places returned a place with no location.");
  return {
    placeId: json.id ?? placeId,
    label: json.displayName?.text || json.formattedAddress || "",
    location: { lat: latitude, lng: longitude },
  };
}
