// The words Fika falls back to when Claude's aren't there: fixed sentences filled from the facts the engine computed.
// Nothing here works out a number; it only writes down the ones it was given. Each of the three languages and both
// tones has its own set, so a commuter who switches still sees the switch when no backend answered. The app keeps
// the same notices in mobile/src/notice/template.ts, word for word.
import type { DraftRequest, DraftWords } from "@/lib/contract";

type Facts = DraftRequest["facts"];
type Language = DraftRequest["language"];
type Tone = DraftRequest["tone"];

/** Where the commuter stands: a departure still ahead, one already gone, or a trip under way. */
type Lead = { at: string } | "now" | "driving";

/** "via Waiyaki Way" and "Waiyaki Way" both read as "Waiyaki Way". */
const roadName = (label: string) => label.replace(/^via /, "");

/** "A", "A and B", "A, B and C" — with the language's own "and". */
const list = (items: string[], and: string) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`;

/** Two sentences, or one when the second is not there. */
const join = (...parts: (string | null)[]) => parts.filter(Boolean).join(" ");

/**
 * One language's sentences. The branching is the same for all three — which sentence to write is a fact about the
 * commute, not about the language — so only the words differ between them and they cannot drift apart in logic.
 */
type Copy = {
  /** "You will arrive around 9:15, 8 min past your 9:00 deadline." */
  late(p: { eta: string; lateMin: number; deadline: string }): string;
  /** The switch the engine says restores on time, with that road's own arrival. */
  orSwitch(p: { road: string; arriveAt: string }): string;
  tell(name: string): string;
  atRisk(p: { lead: Lead; road: string; eta: string }): string;
  onTime(p: { lead: Lead; road: string; eta: string }): string;
  usual(p: { departure: string; arrival: string }): string;
  slower(p: { road: string; min: number }): string;
  unaffected(roads: string[]): string;
  normal(road: string | null): string;
  and: string;
  notice(p: { name: string; minutes: number; eta: string; tone: Tone }): string;
};

const en: Copy = {
  late: ({ eta, lateMin, deadline }) =>
    `You will arrive around ${eta}, ${lateMin ? `${lateMin} min past` : "past"} your ${deadline} deadline.`,
  orSwitch: ({ road, arriveAt }) => `Or switch to ${road} and arrive at ${arriveAt}, back on time.`,
  tell: (name) => `Let ${name} know now, before you are late.`,
  atRisk: ({ lead, road, eta }) =>
    lead === "driving"
      ? `You will arrive at ${eta} via ${road}, inside your buffer.`
      : `${lead === "now" ? "Leave now" : `Leave by ${lead.at}`} via ${road} to arrive at ${eta}, inside your buffer.`,
  onTime: ({ lead, road, eta }) =>
    lead === "driving"
      ? `You will arrive at ${eta} via ${road}, on time.`
      : `${lead === "now" ? "Leave now" : `Leave by ${lead.at}`} via ${road} to arrive at ${eta}.`,
  usual: ({ departure, arrival }) => `Your usual ${departure} gets you there at ${arrival}.`,
  slower: ({ road, min }) => `${road} is ${min} min slower than normal`,
  unaffected: (roads) => `${list(roads, "and")} ${roads.length === 1 ? "is" : "are"} unaffected`,
  normal: (road) => `Traffic is normal${road ? ` on ${road}` : ""}.`,
  and: "and",
  notice: ({ name, minutes, eta, tone }) =>
    tone === "friend"
      ? `Hey${name ? ` ${name}` : ""}, I'm running about ${minutes} minutes late. Should be there by ${eta}. Sorry about that.`
      : `Hi${name ? ` ${name}` : ""}, I will be about ${minutes} minutes late. My ETA is ${eta}. Apologies for the delay.`,
};

const sw: Copy = {
  late: ({ eta, lateMin, deadline }) =>
    `Utafika karibu ${eta}, ${lateMin ? `dakika ${lateMin} ` : ""}baada ya muda wako wa ${deadline}.`,
  orSwitch: ({ road, arriveAt }) => `Au badilisha uende ${road} ufike ${arriveAt}, urudi kwa wakati.`,
  tell: (name) => `Mjulishe ${name} sasa, kabla hujachelewa.`,
  atRisk: ({ lead, road, eta }) =>
    lead === "driving"
      ? `Utafika ${eta} kupitia ${road}, ndani ya muda wako wa ziada.`
      : `${lead === "now" ? "Ondoka sasa" : `Ondoka kabla ya ${lead.at}`} kupitia ${road} ufike ${eta}, ndani ya muda wako wa ziada.`,
  onTime: ({ lead, road, eta }) =>
    lead === "driving"
      ? `Utafika ${eta} kupitia ${road}, kwa wakati.`
      : `${lead === "now" ? "Ondoka sasa" : `Ondoka kabla ya ${lead.at}`} kupitia ${road} ufike ${eta}.`,
  usual: ({ departure, arrival }) => `Muda wako wa kawaida wa ${departure} hukufikisha ${arrival}.`,
  slower: ({ road, min }) => `${road} ina dakika ${min} zaidi ya kawaida`,
  unaffected: (roads) => `${list(roads, "na")} ${roads.length === 1 ? "haijaathirika" : "hazijaathirika"}`,
  normal: (road) => `Trafiki ni ya kawaida${road ? ` kwenye ${road}` : ""}.`,
  and: "na",
  notice: ({ name, minutes, eta, tone }) =>
    tone === "friend"
      ? `Niaje${name ? ` ${name}` : ""}, nitachelewa kama dakika ${minutes}. Nitafika ${eta}. Pole kwa kukuchelewesha.`
      : `Habari${name ? ` ${name}` : ""}, nitachelewa kwa takriban dakika ${minutes}. Nitafika ${eta}. Samahani kwa usumbufu.`,
};

// Sheng is Nairobi's street mix: Swahili sentences with English words left in ("late", "traffic", "buffer").
const sheng: Copy = {
  late: ({ eta, lateMin, deadline }) =>
    `Utafika kama ${eta}, ${lateMin ? `dakika ${lateMin} ` : ""}after deadline yako ya ${deadline}.`,
  orSwitch: ({ road, arriveAt }) => `Ama shika ${road} ufike ${arriveAt}, urudi on time.`,
  tell: (name) => `Ambia ${name} saa hii, kabla uchelewe.`,
  atRisk: ({ lead, road, eta }) =>
    lead === "driving"
      ? `Utafika ${eta} kupitia ${road}, bado uko ndani ya buffer yako.`
      : `${lead === "now" ? "Toka saa hii" : `Toka kabla ya ${lead.at}`} kupitia ${road} ufike ${eta}, bado uko ndani ya buffer yako.`,
  onTime: ({ lead, road, eta }) =>
    lead === "driving"
      ? `Utafika ${eta} kupitia ${road}, uko on time.`
      : `${lead === "now" ? "Toka saa hii" : `Toka kabla ya ${lead.at}`} kupitia ${road} ufike ${eta}.`,
  usual: ({ departure, arrival }) => `Ukitoka ${departure} kama kawaida, unafika ${arrival}.`,
  slower: ({ road, min }) => `${road} iko na dakika ${min} extra kuliko kawaida`,
  unaffected: (roads) => `${list(roads, "na")} ${roads.length === 1 ? "iko" : "ziko"} sawa`,
  normal: (road) => `Traffic iko kawaida${road ? ` kwa ${road}` : ""}.`,
  and: "na",
  notice: ({ name, minutes, eta, tone }) =>
    tone === "friend"
      ? `Niaje${name ? ` ${name}` : ""}, niko late kama dakika ${minutes}. Nafika ${eta}. Pole manze.`
      : `Sasa${name ? ` ${name}` : ""}, niko late kwa dakika ${minutes} hivi. Nafika ${eta}. Pole sana.`,
};

const COPY: Record<Language, Copy> = { en, sw, sheng };

function decisionLine(req: DraftRequest, copy: Copy): string {
  const { facts, recipient } = req;
  const road = roadName(facts.selectedRoute);
  const better = facts.betterRoute;
  const orSwitch = better ? copy.orSwitch({ road: roadName(better.label), arriveAt: better.arriveAt }) : null;

  if (req.state === "late") {
    const late = copy.late({ eta: facts.eta, lateMin: facts.lateMin, deadline: facts.deadline });
    return join(late, orSwitch ?? (recipient.name ? copy.tell(recipient.name) : null));
  }

  // On the road there is no leaving left to do, so the line is about where they stand.
  const lead: Lead = facts.onTheRoad ? "driving" : facts.leaveBy ? { at: facts.leaveBy } : "now";
  if (req.state === "at_risk") return join(copy.atRisk({ lead, road, eta: facts.eta }), orSwitch);

  const usual =
    lead !== "driving" && facts.usualDeparture && facts.usualArrival
      ? copy.usual({ departure: facts.usualDeparture, arrival: facts.usualArrival })
      : null;
  return join(copy.onTime({ lead, road, eta: facts.eta }), usual);
}

/** "Waiyaki Way is 18 min slower than normal; Ngong Road is unaffected." */
function conditionsNote(facts: Facts, copy: Copy): string {
  const routes = facts.routes.map((r) => ({ ...r, label: roadName(r.label) }));
  const slower = routes.filter((r) => r.trafficDelayMin > 0).sort((a, b) => b.trafficDelayMin - a.trafficDelayMin);
  const normal = routes.filter((r) => r.trafficDelayMin === 0).map((r) => r.label);

  if (slower.length === 0) return copy.normal(normal.length === 1 ? normal[0] : null);

  const clauses = slower.map((r) => copy.slower({ road: r.label, min: r.trafficDelayMin }));
  if (normal.length > 0) clauses.push(copy.unaffected(normal));
  return `${clauses.join("; ")}.`;
}

/**
 * The late notice, word for word the app's own template (mobile/src/notice/template.ts). It names no cause: the
 * fallback states only what the engine computed.
 */
const notice = (req: DraftRequest, copy: Copy) =>
  copy.notice({
    name: req.recipient.name.trim(),
    minutes: req.facts.lateMinRounded,
    eta: req.facts.eta,
    tone: req.tone,
  });

/**
 * The deterministic words for a request, in the language and tone it asked for. The notice always states the ETA it
 * was given, so the endpoint's exact-ETA guard holds for the template too.
 */
export function templateWords(req: DraftRequest): DraftWords {
  const copy = COPY[req.language];
  return {
    decision_line: decisionLine(req, copy),
    conditions_note: conditionsNote(req.facts, copy),
    notice: notice(req, copy),
  };
}
