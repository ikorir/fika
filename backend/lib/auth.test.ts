import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { refuse } from "@/lib/auth";

const KEY = "s3cret-demo-key";

const call = (authorization?: string) =>
  refuse(new Request("https://fika-api.test/api/draft", { headers: authorization ? { authorization } : {} }));

describe("refuse", () => {
  beforeEach(() => {
    process.env.FIKA_API_KEY = KEY;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    delete process.env.FIKA_API_KEY;
    vi.restoreAllMocks();
  });

  it("lets the app's key through", () => {
    expect(call(`Bearer ${KEY}`)).toBeNull();
  });

  it("refuses a call with no key", async () => {
    const denied = call();
    expect(denied?.status).toBe(401);
    expect(await denied?.json()).toEqual({ error: "Unauthorized." });
  });

  it("refuses a wrong key, and one that is only a prefix of the real one", () => {
    expect(call(`Bearer ${KEY}x`)?.status).toBe(401);
    expect(call(`Bearer ${KEY.slice(0, -1)}`)?.status).toBe(401);
    expect(call(`Bearer  `)?.status).toBe(401);
  });

  it("refuses the key sent without the Bearer scheme", () => {
    expect(call(KEY)?.status).toBe(401);
  });

  it("stays open when the backend has no key set, so a deploy never locks the app out", () => {
    delete process.env.FIKA_API_KEY;
    expect(call()).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });
});
