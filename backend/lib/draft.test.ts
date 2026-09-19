import { describe, expect, it } from "vitest";

import type { DraftRequest } from "@/lib/contract";
import { draft, type DraftWriter } from "@/lib/draft";

const lateRequest = (over: Partial<DraftRequest["facts"]> = {}): DraftRequest => ({
  state: "late",
  facts: {
    deadline: "9:00",
    leaveBy: null,
    eta: "9:15",
    lateMinRounded: 15,
    usualDeparture: "8:20",
    usualArrival: "9:15",
    selectedRoute: "Waiyaki Way",
    recommendedRoute: "Waiyaki Way",
    routes: [
      { label: "Waiyaki Way", durationMin: 70, trafficDelayMin: 18 },
      { label: "Ngong Road", durationMin: 51, trafficDelayMin: 0 },
    ],
    ...over,
  },
  recipient: { name: "Mary", relationship: "manager" },
  tone: "manager",
  language: "en",
});

/** A Claude that answers with exactly this text. */
const answering = (text: string): DraftWriter => async () => text;

const claudeWords = {
  decision_line: "You will reach work around 9:15, 15 minutes past your deadline.",
  conditions_note: "Waiyaki Way is 18 min slower than normal; Ngong Road is unaffected.",
  notice: "Hi Mary, traffic is heavy this morning. I will be about 15 minutes late — my ETA is 9:15.",
};

describe("draft", () => {
  it("passes Claude's words through when they are valid", async () => {
    const response = await draft(lateRequest(), answering(JSON.stringify(claudeWords)));
    expect(response).toEqual({ ...claudeWords, source: "claude" });
  });
});

describe("draft falls back to Fika's own words", () => {
  const template = {
    decision_line:
      "You will arrive around 9:15, about 15 minutes past your 9:00 deadline. Let Mary know now, before you are late.",
    conditions_note: "Waiyaki Way is 18 min slower than normal; Ngong Road is unaffected.",
    notice: "Hi Mary, I will be about 15 minutes late. My ETA is 9:15. Apologies for the delay.",
    source: "template",
  };

  it("when Claude answers with something that is not the JSON we asked for", async () => {
    expect(await draft(lateRequest(), answering("Sure! Here is the notice: you will be late."))).toEqual(template);
  });

  it("when Claude answers with JSON that is missing a field", async () => {
    const { notice, ...missingNotice } = claudeWords;
    expect(await draft(lateRequest(), answering(JSON.stringify(missingNotice)))).toEqual(template);
  });

  it("when Claude does not answer in time", async () => {
    const never: DraftWriter = () => new Promise(() => {});
    expect(await draft(lateRequest(), never, 20)).toEqual(template);
  });

  it("when Claude's notice does not state the exact ETA the engine computed", async () => {
    const roundedEta = { ...claudeWords, notice: "Hi Mary, I will be about 15 minutes late. My ETA is 9:20." };
    expect(await draft(lateRequest(), answering(JSON.stringify(roundedEta)))).toEqual(template);
  });

  it("with an ETA that is a substring of a longer time, only the exact string counts", async () => {
    const nearly = { ...claudeWords, notice: "Hi Mary, my ETA is 19:15." };
    // "9:15" does appear in "19:15", so this one passes the guard: the check is deliberately a plain containment.
    expect((await draft(lateRequest(), answering(JSON.stringify(nearly)))).source).toBe("claude");
  });
});

describe("the facts Claude is given", () => {
  /** A Claude that records the facts it was handed and then fails, so the template answers. */
  const recording = () => {
    const prompts: string[] = [];
    const writer: DraftWriter = async (prompt) => {
      prompts.push(prompt.user);
      return "not json";
    };
    return { prompts, writer };
  };

  it("names no cause when the engine did not give one", async () => {
    const { prompts, writer } = recording();
    await draft(lateRequest(), writer);
    expect(prompts[0]).not.toMatch(/accident|cause/i);
  });

  it("carries the cause when the engine gave one, as the simulated accident does", async () => {
    const { prompts, writer } = recording();
    await draft(lateRequest({ cause: "Accident on Waiyaki Way" }), writer);
    expect(prompts[0]).toContain("Accident on Waiyaki Way");
  });

  it("leaves out the usual-time projection once the usual departure has gone by", async () => {
    const { prompts, writer } = recording();
    await draft(lateRequest({ usualDeparture: "", usualArrival: "" }), writer);
    expect(prompts[0]).not.toContain("usual_departure");
  });
});

describe("the template", () => {
  const wordsFor = async (req: DraftRequest) => draft(req, answering("not json"));

  it("says which route is slower and which is unaffected", async () => {
    const { conditions_note } = await wordsFor(lateRequest());
    expect(conditions_note).toBe("Waiyaki Way is 18 min slower than normal; Ngong Road is unaffected.");
  });

  it("says traffic is normal when no route is slower than usual", async () => {
    const routes = [{ label: "via Waiyaki Way", durationMin: 45, trafficDelayMin: 0 }];
    const { conditions_note } = await wordsFor(lateRequest({ routes }));
    expect(conditions_note).toBe("Traffic is normal on Waiyaki Way.");
  });

  it("tells an on-time commuter when to leave and what their usual time would cost", async () => {
    const request = { ...lateRequest(), state: "on_time" as const };
    request.facts = { ...request.facts, leaveBy: "8:05", eta: "8:50" };
    const { decision_line } = await wordsFor(request);
    expect(decision_line).toBe("Leave by 8:05 via Waiyaki Way to arrive at 8:50. Your usual 8:20 gets you there at 9:15.");
  });

  it("offers the better route when the commuter is at risk", async () => {
    const request = { ...lateRequest(), state: "at_risk" as const };
    request.facts = { ...request.facts, leaveBy: null, eta: "8:55", recommendedRoute: "Ngong Road" };
    const { decision_line } = await wordsFor(request);
    expect(decision_line).toBe(
      "Leave now via Waiyaki Way to arrive at 8:55, inside your buffer. Or switch to Ngong Road and get back on time.",
    );
  });
});
