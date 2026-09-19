import { describe, expect, it } from "vitest";

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
});
