// The draft endpoint's decision: Claude's words when they are good, Fika's template when they are not.
// Every number in the answer was computed by the app's commute engine and passed in as a fact. Claude is told to
// copy them and never work one out; this module checks the one that matters most, the ETA in the late notice.
import { type DraftRequest, type DraftResponse, DraftWords } from "@/lib/contract";
import { templateWords } from "@/lib/draft-template";

/** About six seconds: long enough for Haiku, short enough that the screen never waits on it. */
export const DRAFT_TIMEOUT_MS = 6_000;

export type DraftPrompt = { system: string; user: string };

/** What the endpoint needs from Claude: the words, as the raw JSON text of its answer. */
export type DraftWriter = (prompt: DraftPrompt, signal: AbortSignal) => Promise<string>;

const LANGUAGE = {
  en: "English",
  sw: "Swahili",
  sheng: "Sheng, the Nairobi street mix of Swahili and English",
} as const;

const TONE = {
  manager: "polite and professional, the way you would write to your manager",
  friend: "warm and casual, the way you would write to a friend",
} as const;

const SYSTEM = `You write the words for Fika, a commute assistant for drivers in Nairobi.

You are given facts that have already been computed for you. Your only job is to say them well.

Rules, in order of importance:
1. Never compute, change, round, convert or add a number, a time or a road name. Copy every one exactly as given,
   including the punctuation of a time ("9:15", not "9.15" or "09:15"). If a number is not in the facts, it does not
   go in your answer.
2. Name a cause for the delay only if the facts include "cause". There is no cause otherwise: say that traffic is
   slow, never why. Do not invent an accident, roadworks, rain, a matatu, a protest or the weather.
3. Write for someone glancing at a phone before driving. Plain sentences, no greeting on the screen text, no emoji,
   no markdown, no exclamation marks.

Answer with JSON holding exactly these three fields:
- "decision_line": one or two sentences telling the commuter what to do now. Under 30 words.
- "conditions_note": one sentence on how today's traffic differs from normal, per route, using the traffic delays
  given. Under 20 words.
- "notice": a message the commuter sends to the person waiting for them, saying how late they will be and when they
  will arrive. It must contain the ETA exactly as given. Two or three short sentences. Write it even when the
  commuter is not late yet, so it is ready if they become late.`;

/** The facts to give Claude, with anything absent left out rather than sent as a blank. */
function promptFacts(req: DraftRequest) {
  const { facts } = req;
  return {
    state: req.state,
    deadline: facts.deadline,
    leave_by: facts.leaveBy ?? "already past; they are leaving now",
    eta: facts.eta,
    ...(facts.lateMinRounded > 0 ? { minutes_late: facts.lateMinRounded } : {}),
    ...(facts.usualDeparture && facts.usualArrival
      ? { usual_departure: facts.usualDeparture, usual_arrival: facts.usualArrival }
      : {}),
    selected_route: facts.selectedRoute,
    recommended_route: facts.recommendedRoute,
    routes: facts.routes.map((r) => ({
      road: r.label,
      minutes: r.durationMin,
      minutes_slower_than_normal: r.trafficDelayMin,
    })),
    ...(facts.cause ? { cause: facts.cause } : {}),
    ...(facts.rain ? { rain_at: facts.rain.at } : {}),
  };
}

/** What Claude is asked. The facts it carries are only the ones the engine computed. */
export function draftPrompt(req: DraftRequest): DraftPrompt {
  const { name, relationship } = req.recipient;
  const to = name ? `${name}, their ${relationship || "contact"}` : `their ${relationship || "contact"}`;
  return {
    system: SYSTEM,
    user: [
      `Write today's words in ${LANGUAGE[req.language]}.`,
      `The notice is to ${to}. Its tone is ${TONE[req.tone]}.`,
      "",
      "Facts:",
      JSON.stringify(promptFacts(req), null, 2),
    ].join("\n"),
  };
}

/** Claude's answer, or nothing if it did not arrive in time. Aborts the call on the way out. */
async function inTime(answer: Promise<string>, signal: AbortController, timeoutMs: number): Promise<string> {
  answer.catch(() => {}); // a failure after the timeout is handled here, not left unhandled
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      answer,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          signal.abort();
          reject(new Error(`Claude did not answer within ${timeoutMs} ms.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The three pieces of writing for one screen. Claude writes them; if its answer is late, is not the JSON we asked
 * for, or leaves the ETA out of the notice, the commuter gets Fika's own words instead. This never throws: the
 * feature the commuter needs most under stress is the one that must not fail.
 */
export async function draft(
  req: DraftRequest,
  writer: DraftWriter,
  timeoutMs: number = DRAFT_TIMEOUT_MS,
): Promise<DraftResponse> {
  const controller = new AbortController();
  try {
    const text = await inTime(writer(draftPrompt(req), controller.signal), controller, timeoutMs);
    const words = DraftWords.parse(JSON.parse(text));
    // The message a commuter sends must state the ETA on their screen, exactly. Anything else and it is wrong.
    if (!words.notice.includes(req.facts.eta)) throw new Error("Claude's notice does not state the ETA it was given.");
    return { ...words, source: "claude" };
  } catch (e) {
    console.warn("POST /api/draft: using the template.", e instanceof Error ? e.message : e);
    return { ...templateWords(req), source: "template" };
  }
}
