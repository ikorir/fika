import { describe, expect, it } from "vitest";

import { tollFor } from "@/lib/tolls";

describe("tollFor", () => {
  it("gives the Nairobi Expressway's private-car fares, lowest to highest, for a route on it", () => {
    expect(tollFor("via Nairobi Expressway")).toEqual({ fromKes: 170, toKes: 500 });
  });

  it("matches the word Expressway in any case", () => {
    expect(tollFor("via nairobi EXPRESSWAY")).toEqual({ fromKes: 170, toKes: 500 });
  });

  it.each(["via Limuru Road", "via Waiyaki Way", "via Thika Superhighway", "Route 2", ""])(
    "gives nothing for %j",
    (label) => {
      expect(tollFor(label)).toBeUndefined();
    },
  );
});
