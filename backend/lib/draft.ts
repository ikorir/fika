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

Fika's engine has already worked out every number. You are given them as facts. Your only job is to say them well.

THE NUMBERS ARE NOT YOURS
- Copy every time and number exactly as given, in the same form: "9:15", never "9.15", "09:15" or "quarter past nine".
- Never do arithmetic. Do not add, subtract, round or compare two numbers to make a new one. "19 min faster",
  "half an hour", "in 25 minutes" are all forbidden unless that exact number is one of the facts.
- If a number is not in the facts, it does not go in your answer.
- Name roads exactly as the facts spell them.

WHAT YOU MAY SAY ABOUT WHY
- A road is slower than normal only by its minutes_slower_than_normal; 0 means it is unaffected.
- Give a reason for the delay only if the facts include "cause", and then only what "cause" says; work it into the
  sentence about that road rather than tacking it on. Otherwise no reason is known: never mention an accident,
  roadworks, rain, weather, a matatu, a protest or a breakdown.

HOW IT READS
Plain sentences for someone glancing at a phone before driving. No emoji, no markdown, no exclamation marks, and no
greeting in decision_line or conditions_note. The screen already shows the state as a label, so do not say "you are
on time" or "you are at risk": say what to do about it.

THE THREE FIELDS

"decision_line" — what to do now. One to three sentences, under 35 words. It always states eta.
- eta is when they arrive on selected_route, and on no other road. The road named in the same sentence as eta is
  always selected_route. Never attach eta, or any other time, to a road it does not belong to.
- leave_by is the time to leave by. leave_now instead means that time has gone by, so tell them to leave now — they
  are still standing there, not driving. already_driving, and only that, means they are on the road: then do not
  tell them to leave at all, tell them where they stand.
- state "on_time": leave by leave_by via selected_route and arrive at eta. If usual_departure is given, add what
  leaving at their usual time would get them instead.
- state "at_risk": they arrive at eta, inside their buffer.
- state "late": say all three of these, in this order — they will arrive at eta; that is minutes_late past their
  deadline; they should let the person named below know now, before they are late. Do not open with "you are late":
  the screen says that, and it is the arrival that is late, not them yet.
- Never suggest changing route unless route_that_gets_them_there_on_time is in the facts, and then name only that
  road, and give its own "arrives" time, never eta. Whether another road still
  helps is the engine's call, not yours, and it has already made it: no such fact means no switch is worth
  offering, whatever the other roads' numbers look like. Never say a road is faster by some amount. When
  already_driving is there, no switch is possible at all.
- Use minutes_late here, not minutes_late_for_the_message: the screen shows the exact figure beside the ETA.
- Name a road as "via Waiyaki Way" when the sentence allows it, the way a driver would say it.
- Leave how today's traffic compares to normal to conditions_note, which sits right underneath: the two lines are
  read together and must not say the same thing twice.

"conditions_note" — one sentence, under 20 words, on how today differs from normal. Name each slower road and its
delay in the form "Waiyaki Way is 18 min slower than normal", and say which roads are unaffected. Use "min", not
"minutes". If no road is slower than normal, say traffic is normal.

"notice" — the message the commuter sends to the person waiting for them, in the tone and language asked for.
Two or three short sentences addressed to them by name. It must contain eta exactly as written. If
minutes_late_for_the_message is given, say they will be about that many minutes late — that is the figure to promise
someone, rounded up so it can be kept. If it is not given, they are not late yet, so say only when they now expect to
arrive. Promise nothing the facts do not state.`;

/** The facts to give Claude, with anything absent left out rather than sent as a blank. */
function promptFacts(req: DraftRequest) {
  const { facts } = req;
  return {
    state: req.state,
    deadline: facts.deadline,
    ...(facts.onTheRoad ? { already_driving: true } : facts.leaveBy ? { leave_by: facts.leaveBy } : { leave_now: true }),
    eta: facts.eta,
    ...(facts.lateMin > 0 ? { minutes_late: facts.lateMin } : {}),
    ...(facts.lateMinRounded > 0 ? { minutes_late_for_the_message: facts.lateMinRounded } : {}),
    ...(facts.usualDeparture && facts.usualArrival
      ? { usual_departure: facts.usualDeparture, usual_arrival: facts.usualArrival }
      : {}),
    // The route the screen is showing, and the one — if any — the engine says would restore on time. Which other
    // road is "best" is deliberately not here: given it, Claude offers a switch the engine has already ruled out.
    selected_route: facts.selectedRoute,
    ...(facts.betterRoute
      ? { route_that_gets_them_there_on_time: { road: facts.betterRoute.label, arrives: facts.betterRoute.arriveAt } }
      : {}),
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

// A clock time ("9:15", "08:05") and a count of minutes ("18 min", "about 10 minutes") as they appear in writing.
const TIME = /\d{1,2}:\d{2}/g;
const MINUTES = /(\d+)\s*(?:min\b|minutes?\b|dakika)/g;

/** Every time and minute count the engine computed, as strings, in the forms Claude was given them. */
function knownNumbers({ facts }: DraftRequest) {
  const times = [
    facts.deadline,
    facts.leaveBy,
    facts.eta,
    facts.usualDeparture,
    facts.usualArrival,
    facts.betterRoute?.arriveAt,
  ];
  const minutes = [facts.lateMin, facts.lateMinRounded, ...facts.routes.flatMap((r) => [r.durationMin, r.trafficDelayMin])];
  return {
    times: new Set(times.filter((t): t is string => Boolean(t))),
    minutes: new Set(minutes.map(String)),
  };
}

/**
 * Whether the words state only numbers the engine computed. Claude is told never to work one out, and mostly does
 * not; this is what makes that true rather than likely. A time or a count of minutes that is not among the facts —
 * a difference between two routes, a rounded ETA, an invented "in 25 minutes" — sends the whole answer back and
 * Fika's own words go out instead.
 */
function statesOnlyKnownNumbers(words: DraftWords, req: DraftRequest): boolean {
  const known = knownNumbers(req);
  const text = `${words.decision_line} ${words.conditions_note} ${words.notice}`;
  // Times first, so the minutes of "9:15" are never read as a count of minutes.
  for (const [time] of text.matchAll(TIME)) if (!known.times.has(time)) return false;
  for (const [, count] of text.replace(TIME, " ").matchAll(MINUTES)) if (!known.minutes.has(count)) return false;
  return true;
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
    if (!statesOnlyKnownNumbers(words, req)) throw new Error("Claude's words state a number the engine did not compute.");
    return { ...words, source: "claude" };
  } catch (e) {
    console.warn("POST /api/draft: using the template.", e instanceof Error ? e.message : e);
    return { ...templateWords(req), source: "template" };
  }
}
