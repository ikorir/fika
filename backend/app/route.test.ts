import { describe, expect, it } from "vitest";

import { GET } from "@/app/route";

describe("GET /", () => {
  it("says the backend is up", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
