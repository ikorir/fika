import { describe, expect, it } from "vitest";

import type { RoutesRequest } from "@/lib/contract";
import { rainForecast } from "@/lib/weather";

// A Nairobi morning: usual departure 8:00, deadline 9:00, checked at 7:10 (all +03:00).
const req: RoutesRequest = {
  origin: { lat: -1.2635, lng: 36.8024 },
  destination: { lat: -1.2921, lng: 36.8219 },
  arriveBy: "2026-09-21T09:00:00+03:00",
  usualDeparture: "2026-09-21T08:00:00+03:00",
};
const now = new Date("2026-09-21T07:10:00+03:00");

const hour = (h: number) => Date.parse(`2026-09-21T${String(h).padStart(2, "0")}:00:00+03:00`) / 1000;

/** An Open-Meteo that answers with these chances of rain, keyed by the hour they END at, as Open-Meteo reports them. */
const forecasting = (chances: Record<number, number | null>) => {
  const hours = Object.keys(chances).map(Number);
  const urls: string[] = [];
  const fetcher = async (url: string | URL) => {
    urls.push(String(url));
    return Response.json({
      hourly: { time: hours.map(hour), precipitation_probability: hours.map((h) => chances[h]) },
    });
  };
  return { urls, fetcher };
};

describe("rainForecast", () => {
  it("asks Open-Meteo for the hourly chance of rain at the origin", async () => {
    const { urls, fetcher } = forecasting({});
    await rainForecast(req, now, fetcher);
    const url = new URL(urls[0]);
    expect(url.origin + url.pathname).toBe("https://api.open-meteo.com/v1/forecast");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      latitude: "-1.2635",
      longitude: "36.8024",
      hourly: "precipitation_probability",
      timeformat: "unixtime",
    });
  });

  it("says when rain starts: the beginning of the first likely hour between leaving and the deadline", async () => {
    // Open-Meteo's figure is for the hour before its timestamp, so 9:00's 80% is rain from 8:00.
    const { fetcher } = forecasting({ 7: 10, 8: 20, 9: 80, 10: 90 });
    expect(await rainForecast(req, now, fetcher)).toEqual({ at: "2026-09-21T05:00:00.000Z" });
  });

  it("says nothing when rain is unlikely in those hours", async () => {
    const { fetcher } = forecasting({ 7: 10, 8: 49, 9: 30, 10: 5 });
    expect(await rainForecast(req, now, fetcher)).toBeNull();
  });

  it("ignores rain before anyone would leave and well after the deadline", async () => {
    // Rain until 7:00 is over by now; rain from 10:00 starts after even a late commuter has arrived.
    const { fetcher } = forecasting({ 7: 95, 8: 0, 9: 0, 10: 0, 11: 95 });
    expect(await rainForecast(req, now, fetcher)).toBeNull();
  });

  it("ignores rain hours before the usual departure, however early the commuter looks", async () => {
    const early = new Date("2026-09-21T05:00:00+03:00");
    const { fetcher } = forecasting({ 6: 90, 7: 90, 8: 0, 9: 0 });
    expect(await rainForecast(req, early, fetcher)).toBeNull();
  });

  it("counts the hour already under way, as rain from now rather than from a time gone by", async () => {
    const late = new Date("2026-09-21T07:50:00+03:00");
    const { fetcher } = forecasting({ 8: 70, 9: 0 });
    expect(await rainForecast(req, late, fetcher)).toEqual({ at: "2026-09-21T04:50:00.000Z" });
  });

  it("looks an hour past the deadline, for the commuter who is running late; the app knows their ETA", async () => {
    const { fetcher } = forecasting({ 8: 0, 9: 0, 10: 95, 11: 95 });
    expect(await rainForecast(req, now, fetcher)).toEqual({ at: "2026-09-21T06:00:00.000Z" });
  });

  it("skips an hour Open-Meteo has no figure for", async () => {
    const { fetcher } = forecasting({ 8: null, 9: 60 });
    expect(await rainForecast(req, now, fetcher)).toEqual({ at: "2026-09-21T05:00:00.000Z" });
  });

  it.each([
    ["Open-Meteo cannot be reached", async () => Promise.reject(new Error("network down"))],
    ["it answers with an error", async () => Response.json({ error: true, reason: "bad" }, { status: 400 })],
    ["it answers with something that is not a forecast", async () => Response.json({ hourly: { time: "soon" } })],
    ["its hours and figures do not line up", async () => Response.json({ hourly: { time: [hour(9)], precipitation_probability: [] } })],
  ])("says nothing, and does not throw, when %s", async (_, fetcher) => {
    expect(await rainForecast(req, now, fetcher)).toBeNull();
  });
});
