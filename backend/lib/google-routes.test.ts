import { describe, expect, it } from "vitest";

import { toRoutes } from "@/lib/google-routes";

describe("toRoutes", () => {
  it("names each route by its main road and keys it by a slug of that name", () => {
    const [route] = toRoutes([
      {
        duration: "2700s",
        staticDuration: "1980s",
        distanceMeters: 14250,
        description: "Waiyaki Way",
        polyline: { encodedPolyline: "abc" },
      },
    ]);
    expect(route).toEqual({
      id: "waiyaki-way",
      label: "via Waiyaki Way",
      durationSec: 2700,
      staticDurationSec: 1980,
      distanceM: 14250,
      polyline: "abc",
    });
  });

  it("keeps ids unique when two routes share a road, and caps the list at 3", () => {
    const routes = toRoutes([
      { description: "Ngong Road" },
      { description: "Ngong Road" },
      {},
      { description: "Mombasa Road" },
    ]);
    expect(routes.map((r) => [r.id, r.label])).toEqual([
      ["ngong-road", "via Ngong Road"],
      ["ngong-road-2", "via Ngong Road"],
      ["route-3", "Route 3"],
    ]);
  });
});
