// Whether rain is forecast around the drive, from Open-Meteo: free, no key, so nothing here is a secret. It is a
// nice-to-have on a screen that must never fail, so every way this can go wrong ends the same way — no rain is
// reported and the conditions note simply does not mention it.
import { z } from "zod";

import type { RoutesRequest } from "@/lib/contract";

const MIN = 60_000;
const HOUR = 60 * MIN;
// A chance of rain at or above this is worth a sentence; below it the note would cry wolf most mornings.
const LIKELY_PERCENT = 50;
// Nobody leaves much earlier than their usual time, so rain that is over before then is not about this drive.
const BEFORE_USUAL_MIN = 30;
// The routes are fetched alongside and take a couple of seconds themselves, so a forecast that answers — as it does
// in well under a second — costs nothing. One that hangs holds the routes up by no more than this.
const TIMEOUT_MS = 2_000;
// The backend does not know the ETA, so it looks this far past the deadline for the commuter who is running late.
// The app, which does, drops rain that starts after they arrive.
const AFTER_DEADLINE_MIN = 60;

const Forecast = z
  .object({
    hourly: z.object({
      time: z.array(z.number()), // unix seconds
      precipitation_probability: z.array(z.number().nullable()),
    }),
  })
  .refine(({ hourly }) => hourly.time.length === hourly.precipitation_probability.length);

type Fetcher = (url: string | URL, init?: RequestInit) => Promise<Response>;

/**
 * When rain is likely to start during the drive, or null when it is not — or when the forecast could not be had.
 * The drive is from about the usual departure (or now, once that is later) to an hour past the deadline. Open-Meteo
 * reports each hour's chance against the time the hour ENDS, so rain "at" is the start of the first likely hour —
 * or now, when that hour is already under way. Never throws.
 */
export async function rainForecast(
  req: RoutesRequest,
  now: Date,
  fetcher: Fetcher = fetch,
): Promise<{ at: string } | null> {
  const from = Math.max(now.getTime(), Date.parse(req.usualDeparture) - BEFORE_USUAL_MIN * MIN);
  const to = Math.max(Date.parse(req.arriveBy) + AFTER_DEADLINE_MIN * MIN, from + HOUR);

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(req.origin.lat),
    longitude: String(req.origin.lng),
    hourly: "precipitation_probability",
    timeformat: "unixtime",
    forecast_days: "2", // a deadline early tomorrow is past the end of today's hours
  }).toString();

  try {
    const res = await fetcher(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`Open-Meteo answered ${res.status}.`);
    const { hourly } = Forecast.parse(await res.json());
    for (const [i, seconds] of hourly.time.entries()) {
      const [start, end] = [seconds * 1000 - HOUR, seconds * 1000];
      const chance = hourly.precipitation_probability[i];
      if (end > from && start < to && chance !== null && chance >= LIKELY_PERCENT)
        return { at: new Date(Math.max(start, now.getTime())).toISOString() };
    }
    return null;
  } catch (e) {
    console.warn("Rain forecast: none today.", e instanceof Error ? e.message : e);
    return null;
  }
}
