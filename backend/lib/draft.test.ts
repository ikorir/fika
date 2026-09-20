import { describe, expect, it } from "vitest";

import type { DraftRequest } from "@/lib/contract";
import { draft, type DraftWriter } from "@/lib/draft";

const lateRequest = (over: Partial<DraftRequest["facts"]> = {}): DraftRequest => ({
  state: "late",
  facts: {
    deadline: "9:00",
    leaveBy: null,
    onTheRoad: false,
    eta: "9:15",
    lateMin: 15,
    lateMinRounded: 15,
    usualDeparture: "8:20",
    usualArrival: "9:15",
    selectedRoute: "Waiyaki Way",
    recommendedRoute: "Waiyaki Way",
    betterRoute: null,
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
      "You will arrive around 9:15, 15 min past your 9:00 deadline. Let Mary know now, before you are late.",
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

  it("when Claude states a time the engine never computed, even one the ETA hides inside", async () => {
    // "9:15" does appear in "19:15", so containment alone would let this through.
    const nearly = { ...claudeWords, notice: "Hi Mary, my ETA is 19:15." };
    expect((await draft(lateRequest(), answering(JSON.stringify(nearly)))).source).toBe("template");
  });

  it("when Claude works out a number of its own, such as how much faster another road is", async () => {
    const worked = { ...claudeWords, decision_line: "Ngong Road is 19 min faster. You will arrive at 9:15." };
    expect((await draft(lateRequest(), answering(JSON.stringify(worked)))).source).toBe("template");
  });

  it("but not when every number it states is one it was given", async () => {
    const given = { ...claudeWords, decision_line: "Waiyaki Way takes 70 min today, 18 min more than normal." };
    expect((await draft(lateRequest(), answering(JSON.stringify(given)))).source).toBe("claude");
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

  it("offers the route the engine says restores on time, and only that one", async () => {
    const request = { ...lateRequest(), state: "at_risk" as const };
    request.facts = { ...request.facts, eta: "8:55", recommendedRoute: "Ngong Road" };
    expect((await wordsFor(request)).decision_line).toBe(
      "Leave now via Waiyaki Way to arrive at 8:55, inside your buffer.",
    );

    request.facts = { ...request.facts, betterRoute: { label: "Ngong Road", arriveAt: "8:36" } };
    expect((await wordsFor(request)).decision_line).toBe(
      "Leave now via Waiyaki Way to arrive at 8:55, inside your buffer. Or switch to Ngong Road and arrive at 8:36, back on time.",
    );
  });

  it("tells a commuter already driving where they stand, not to leave", async () => {
    const request = { ...lateRequest(), state: "at_risk" as const };
    request.facts = { ...request.facts, onTheRoad: true, eta: "8:55" };
    expect((await wordsFor(request)).decision_line).toBe(
      "You will arrive at 8:55 via Waiyaki Way, inside your buffer.",
    );
  });

  it("states the exact lateness the screen shows, not the figure rounded up for the message", async () => {
    const request = lateRequest({ lateMin: 8, lateMinRounded: 10, eta: "9:08" });
    expect((await wordsFor(request)).decision_line).toBe(
      "You will arrive around 9:08, 8 min past your 9:00 deadline. Let Mary know now, before you are late.",
    );
    expect((await wordsFor(request)).notice).toContain("about 10 minutes late");
  });
});

describe("the template in Swahili and Sheng", () => {
  const languages = ["en", "sw", "sheng"] as const;
  /** The words for a late request in one language and tone, with Claude failing so the template answers. */
  const fallback = async (language: DraftRequest["language"], tone: DraftRequest["tone"] = "manager") =>
    draft({ ...lateRequest({ lateMin: 8, lateMinRounded: 10, eta: "9:08" }), language, tone }, answering("not json"));

  it.each(languages)("states the exact ETA in %s", async (language) => {
    const { notice, source } = await fallback(language);
    expect([source, notice.includes("9:08")]).toEqual(["template", true]);
  });

  it.each(languages)("promises the rounded lateness in %s, not the exact figure", async (language) => {
    const { notice } = await fallback(language);
    expect(notice).toMatch(/\b10\b/);
    expect(notice).not.toMatch(/\b8\b/);
  });

  it.each(languages)("writes the decision line and conditions note in %s too", async (language) => {
    const { decision_line, conditions_note } = await fallback(language);
    expect(decision_line).toContain("9:08");
    expect(conditions_note).toMatch(/18/);
  });

  it("writes each language differently, so a switch is visible with no backend answer", async () => {
    const [en, sw, sheng] = await Promise.all(languages.map((l) => fallback(l)));
    expect(new Set([en.notice, sw.notice, sheng.notice]).size).toBe(3);
  });

  it.each(languages)("changes the words with the tone in %s", async (language) => {
    const [manager, friend] = await Promise.all([fallback(language, "manager"), fallback(language, "friend")]);
    expect(manager.notice).not.toBe(friend.notice);
    expect(friend.notice).toContain("9:08");
  });
});

describe("the language and tone asked for", () => {
  const recording = () => {
    const prompts: string[] = [];
    const writer: DraftWriter = async (prompt) => {
      prompts.push(prompt.user);
      return "not json";
    };
    return { prompts, writer };
  };

  it.each([
    ["en", "manager", /English/, /manager/],
    ["sw", "friend", /Swahili/, /friend/],
    ["sheng", "friend", /Sheng/, /friend/],
  ] as const)("reach Claude for %s and %s", async (language, tone, inLanguage, inTone) => {
    const { prompts, writer } = recording();
    await draft({ ...lateRequest(), language, tone }, writer);
    expect(prompts[0]).toMatch(inLanguage);
    expect(prompts[0]).toMatch(inTone);
  });

  it("catches a number the engine never computed when Claude writes it in Swahili", async () => {
    const worked = {
      decision_line: "Utafika karibu 9:15.",
      conditions_note: "Waiyaki Way ina dakika 18 zaidi ya kawaida.",
      notice: "Habari Mary, nitachelewa kwa dakika 37. Nitafika 9:15.",
    };
    const response = await draft({ ...lateRequest(), language: "sw" }, answering(JSON.stringify(worked)));
    expect(response.source).toBe("template");
  });

  it("catches it whichever side of the word the number is written", async () => {
    const worked = {
      decision_line: "Utafika karibu 9:15.",
      conditions_note: "Waiyaki Way ina dakika 18 zaidi ya kawaida.",
      notice: "Habari Mary, nitachelewa kama 37 dakika. Nitafika 9:15.",
    };
    const response = await draft({ ...lateRequest(), language: "sw" }, answering(JSON.stringify(worked)));
    expect(response.source).toBe("template");
  });

  it("but lets a Swahili count the engine did compute through", async () => {
    const good = {
      decision_line: "Utafika karibu 9:15, dakika 15 baada ya muda wako.",
      conditions_note: "Waiyaki Way ina dakika 18 zaidi ya kawaida.",
      notice: "Habari Mary, nitachelewa kwa dakika 15. Nitafika 9:15.",
    };
    const response = await draft({ ...lateRequest(), language: "sw" }, answering(JSON.stringify(good)));
    expect(response.source).toBe("claude");
  });
});

describe("rain", () => {
  const rain = { at: "7:30" };
  const rainyWords = { ...claudeWords, conditions_note: "Waiyaki Way is 18 min slower than normal. Rain is forecast from 7:30." };
  const failing = answering("not json");

  it("reaches Claude as a fact when it is forecast, with the time it starts", async () => {
    const prompts: string[] = [];
    await draft(lateRequest({ rain }), async (prompt) => (prompts.push(prompt.user), "not json"));
    expect(prompts[0]).toContain('"rain_at": "7:30"');
  });

  it("lets Claude state the time the rain starts, which is one the forecast gave", async () => {
    expect(await draft(lateRequest({ rain }), answering(JSON.stringify(rainyWords)))).toEqual({
      ...rainyWords,
      source: "claude",
    });
  });

  it.each([
    ["en", "Waiyaki Way is 18 min slower than normal; Ngong Road is unaffected. Rain is forecast from 7:30, so allow extra time."],
    ["sw", "Waiyaki Way ina dakika 18 zaidi ya kawaida; Ngong Road haijaathirika. Mvua inatarajiwa kuanzia 7:30, kwa hivyo jipe muda zaidi."],
    ["sheng", "Waiyaki Way iko na dakika 18 extra kuliko kawaida; Ngong Road iko sawa. Mvua inakuja kuanzia 7:30, so jipe time extra."],
  ] as const)("is in the template's conditions note in %s", async (language, note) => {
    expect((await draft({ ...lateRequest({ rain, leaveBy: "7:05" }), language }, failing)).conditions_note).toBe(note);
  });

  it("only tells a commuter to allow extra time while there is still a departure ahead of them", async () => {
    const ahead = await draft(lateRequest({ rain, leaveBy: "7:05" }), failing);
    const driving = await draft(lateRequest({ rain, onTheRoad: true }), failing);
    expect(ahead.conditions_note).toMatch(/Rain is forecast from 7:30, so allow extra time\.$/);
    expect(driving.conditions_note).toMatch(/Rain is forecast from 7:30\.$/);
  });

  it("is not given to Claude or mentioned by the template when none is forecast", async () => {
    const prompts: string[] = [];
    const words = await draft(lateRequest(), async (prompt) => (prompts.push(prompt.user), "not json"));
    expect(prompts[0]).not.toMatch(/rain/i);
    expect(Object.values(words).join(" ")).not.toMatch(/rain/i);
  });

  it("sends Claude's words back when they mention rain that was never forecast", async () => {
    const invented = { ...claudeWords, conditions_note: "Waiyaki Way is 18 min slower than normal because of the rain." };
    expect((await draft(lateRequest(), answering(JSON.stringify(invented)))).source).toBe("template");
  });

  it("keeps a forecast out of the notice, where it would read as the reason for being late", async () => {
    const blaming = { ...rainyWords, notice: "Hi Mary, it is raining, so I will be about 15 minutes late. My ETA is 9:15." };
    expect((await draft(lateRequest({ rain }), answering(JSON.stringify(blaming)))).source).toBe("template");
  });

  it.each(["a storm is coming", "the weather is bad", "heavy rainfall", "showers on the way"])(
    "catches the weather by its other names: %s",
    async (phrase) => {
      const invented = { ...claudeWords, conditions_note: `Waiyaki Way is 18 min slower than normal, ${phrase}.` };
      expect((await draft(lateRequest(), answering(JSON.stringify(invented)))).source).toBe("template");
    },
  );

  it("does not mistake a name for the weather: a contact called Rain, a road called Rain Tree Road", async () => {
    const routes = [{ label: "Rain Tree Road", durationMin: 70, trafficDelayMin: 18 }];
    const req = { ...lateRequest({ routes, selectedRoute: "Rain Tree Road" }), recipient: { name: "Rain", relationship: "friend" } };
    const words = {
      decision_line: "You will arrive at 9:15 via Rain Tree Road, 15 min past your deadline. Let Rain know now.",
      conditions_note: "Rain Tree Road is 18 min slower than normal.",
      notice: "Hi Rain, I will be about 15 minutes late. My ETA is 9:15.",
    };
    expect((await draft(req, answering(JSON.stringify(words)))).source).toBe("claude");
  });

  it.each(["mvua inanyesha", "kuna Mvua leo"])("catches it in Swahili and Sheng too: %s", async (phrase) => {
    const invented = { ...claudeWords, notice: `Habari Mary, ${phrase}. Nitafika 9:15.` };
    expect((await draft({ ...lateRequest(), language: "sw" }, answering(JSON.stringify(invented)))).source).toBe("template");
  });
});
