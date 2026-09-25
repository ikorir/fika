import { describe, expect, it } from "vitest";

import { RoutesResponse } from "@/lib/contract";
import { type GoogleRoute, toRoutes } from "@/lib/google-routes";

const step = (distanceMeters: number, instructions: string) => ({
  distanceMeters,
  navigationInstruction: { instructions },
});

describe("toRoutes", () => {
  it("names a route by the road it spends the most distance on, and keys it by a slug of that name", () => {
    const [route] = toRoutes([
      {
        duration: "2700s",
        staticDuration: "1980s",
        distanceMeters: 12121,
        description: "A104",
        polyline: { encodedPolyline: "abc" },
        legs: [
          {
            steps: [
              step(3751, "Continue onto Waiyaki Wy/A104\nContinue to follow A104"),
              step(2570, "Merge onto Kisumu- Nairobi Rd/Nairobi - Nakuru Hwy/Waiyaki Wy/A104/A8"),
              step(823, "At the roundabout, take the 3rd exit onto Haile Selassie Ave"),
              step(787, "At the roundabout, take the 2nd exit and stay on Uhuru Hwy/A104"),
            ],
          },
        ],
      },
    ]);
    expect(route).toEqual({
      id: "waiyaki-way",
      label: "via Waiyaki Way",
      durationSec: 2700,
      staticDurationSec: 1980,
      distanceM: 12121,
      polyline: "abc",
    });
  });

  it("gives routes that share a main road different names, using each one's next-longest other road", () => {
    // A step can list several names for the same stretch; those are one road, not a next-longest one.
    const shared = [step(6000, "Merge onto Kisumu- Nairobi Rd/Waiyaki Wy/A104"), step(2000, "Continue onto Waiyaki Wy")];
    const routes = toRoutes([
      { legs: [{ steps: [...shared, step(1000, "Turn right onto James Gichuru Rd")] }] },
      { legs: [{ steps: [...shared, step(3000, "Turn left onto Ngong Rd")] }] },
    ]);
    expect(routes.map((r) => [r.id, r.label])).toEqual([
      ["waiyaki-way", "via Waiyaki Way"],
      ["ngong-road", "via Ngong Road"],
    ]);
  });

  it("names the same routes the same way whatever order Google returns them in", () => {
    const shared = step(6000, "Continue onto Waiyaki Wy/A104");
    const viaGichuru = { legs: [{ steps: [shared, step(1000, "Turn right onto James Gichuru Rd")] }] };
    const viaNgong = { legs: [{ steps: [step(7000, "Continue onto Waiyaki Wy"), step(3000, "Turn left onto Ngong Rd")] }] };
    expect(toRoutes([viaGichuru, viaNgong]).map((r) => r.label)).toEqual(["via James Gichuru Road", "via Waiyaki Way"]);
    expect(toRoutes([viaNgong, viaGichuru]).map((r) => r.label)).toEqual(["via Waiyaki Way", "via James Gichuru Road"]);
  });

  it("lets the faster route keep a main road that two routes spend the same distance on", () => {
    const expressway = step(7570, "Slight right onto Nairobi Expy/A8");
    const routes = toRoutes([
      { duration: "1097s", legs: [{ steps: [expressway, step(915, "Take the 2nd exit onto Lower Hill Rd")] }] },
      { duration: "1017s", legs: [{ steps: [expressway, step(1051, "Turn left onto Upper Hill Rd")] }] },
    ]);
    expect(routes.map((r) => r.label)).toEqual(["via Lower Hill Road", "via Nairobi Expressway"]);
  });

  it("breaks a tie between names of one stretch by how far that name runs across all the routes", () => {
    const routes = toRoutes([
      { legs: [{ steps: [step(2570, "Merge onto Kisumu- Nairobi Rd/Waiyaki Wy/A104"), step(2118, "Slight right onto Nairobi Expy/A8")] }] },
      { legs: [{ steps: [step(9000, "Continue onto Mombasa Rd"), step(500, "Turn left onto Waiyaki Wy")] }] },
    ]);
    expect(routes.map((r) => r.label)).toEqual(["via Waiyaki Way", "via Mombasa Road"]);
  });

  it("reads the road up to a \"toward\" landmark", () => {
    const [route] = toRoutes([{ legs: [{ steps: [step(900, "Head east on Waiyaki Wy toward Kapenguria Rd")] }] }]);
    expect(route.label).toBe("via Waiyaki Way");
  });

  it("falls back to the route description, then to a number, and caps the list at 3", () => {
    const routes = toRoutes([
      { description: "Nairobi Expy/A8" },
      { description: "A104" },
      {},
      { description: "Mombasa Rd" },
    ] satisfies GoogleRoute[]);
    expect(routes.map((r) => [r.id, r.label])).toEqual([
      ["nairobi-expressway", "via Nairobi Expressway"],
      ["a104", "via A104"],
      ["route-3", "Route 3"],
    ]);
  });

  it("puts the Expressway's toll on the route that uses it, and on no other", () => {
    const routes = toRoutes([
      { duration: "3000s", legs: [{ steps: [step(9000, "Merge onto Nairobi Expy/A8")] }] },
      { duration: "2800s", legs: [{ steps: [step(9000, "Continue onto Limuru Rd/C63")] }] },
    ]);
    expect(routes.map((r) => [r.label, r.toll])).toEqual([
      ["via Nairobi Expressway", { fromKes: 170, toKes: 500 }],
      ["via Limuru Road", undefined],
    ]);
    expect("toll" in routes[1]).toBe(false);
  });

  it("keeps the toll through the response the routes endpoint parses and sends", () => {
    const routes = toRoutes([{ duration: "3000s", legs: [{ steps: [step(9000, "Merge onto Nairobi Expy/A8")] }] }]);
    const sent = RoutesResponse.parse({
      fetchedAt: "2026-09-21T04:00:00.000Z",
      samples: [{ departAt: "2026-09-21T04:15:00.000Z", kind: "step", routes }],
    });
    expect(sent.samples[0].routes[0].toll).toEqual({ fromKes: 170, toKes: 500 });
  });
});
