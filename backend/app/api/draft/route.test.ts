import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/draft/route";

describe("POST /api/draft", () => {
  beforeEach(() => {
    process.env.FIKA_API_KEY = "s3cret-demo-key";
  });
  afterEach(() => {
    delete process.env.FIKA_API_KEY;
  });

  // The 401 comes before the body is read: an unknown caller learns nothing about the shape of the request.
  it("refuses a call without the key, before parsing anything", async () => {
    const res = await POST(new Request("https://fika-api.test/api/draft", { method: "POST", body: "not json" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized." });
  });

  it("gets past the key and on to validation when the key is right", async () => {
    const res = await POST(
      new Request("https://fika-api.test/api/draft", {
        method: "POST",
        headers: { authorization: "Bearer s3cret-demo-key" },
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
  });
});
