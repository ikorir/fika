// The words Fika falls back to when Claude's aren't there: fixed sentences filled from the facts the engine computed.
// Nothing here works out a number; it only writes down the ones it was given. The app keeps the same English notice
// in mobile/src/notice/template.ts, so a commuter sees the same message whether the backend answered or not.
import type { DraftRequest, DraftWords } from "@/lib/contract";

type Facts = DraftRequest["facts"];

/** "via Waiyaki Way" and "Waiyaki Way" both read as "Waiyaki Way". */
const roadName = (label: string) => label.replace(/^via /, "");

/** "A", "A and B", "A, B and C". */
function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function decisionLine(req: DraftRequest): string {
  const { facts, recipient } = req;
  const selected = roadName(facts.selectedRoute);
  const recommended = roadName(facts.recommendedRoute);
  const usual =
    facts.usualDeparture && facts.usualArrival
      ? ` Your usual ${facts.usualDeparture} gets you there at ${facts.usualArrival}.`
      : "";

  if (req.state === "late") {
    const late = facts.lateMinRounded
      ? `about ${facts.lateMinRounded} minutes past your ${facts.deadline} deadline`
      : `past your ${facts.deadline} deadline`;
    const tell = recipient.name ? ` Let ${recipient.name} know now, before you are late.` : "";
    return `You will arrive around ${facts.eta}, ${late}.${tell}`;
  }

  const lead = facts.leaveBy ? `Leave by ${facts.leaveBy}` : "Leave now";
  if (req.state === "at_risk") {
    const other =
      recommended && recommended !== selected ? ` Or switch to ${recommended} and get back on time.` : "";
    return `${lead} via ${selected} to arrive at ${facts.eta}, inside your buffer.${other}`;
  }
  return `${lead} via ${selected} to arrive at ${facts.eta}.${usual}`;
}

/** "Waiyaki Way is 18 min slower than normal; Ngong Road is unaffected." */
function conditionsNote(facts: Facts): string {
  const routes = facts.routes.map((r) => ({ ...r, label: roadName(r.label) }));
  const slower = routes.filter((r) => r.trafficDelayMin > 0).sort((a, b) => b.trafficDelayMin - a.trafficDelayMin);
  const normal = routes.filter((r) => r.trafficDelayMin === 0).map((r) => r.label);

  if (slower.length === 0) {
    const where = normal.length === 1 ? ` on ${normal[0]}` : "";
    return `Traffic is normal${where}.`;
  }
  const clauses = slower.map((r) => `${r.label} is ${r.trafficDelayMin} min slower than normal`);
  if (normal.length > 0) clauses.push(`${list(normal)} ${normal.length === 1 ? "is" : "are"} unaffected`);
  return `${clauses.join("; ")}.`;
}

/**
 * The late notice, word for word the app's own English template (mobile/src/notice/template.ts). It names no cause:
 * the fallback states only what the engine computed.
 */
function notice(req: DraftRequest): string {
  const name = req.recipient.name.trim();
  const { eta, lateMinRounded } = req.facts;
  return `Hi${name ? ` ${name}` : ""}, I will be about ${lateMinRounded} minutes late. My ETA is ${eta}. Apologies for the delay.`;
}

/**
 * The deterministic words for a request. Swahili and Sheng fall back to English until ticket 08 writes them; the
 * notice always states the ETA it was given, so the endpoint's exact-ETA guard holds for the template too.
 */
export function templateWords(req: DraftRequest): DraftWords {
  return { decision_line: decisionLine(req), conditions_note: conditionsNote(req.facts), notice: notice(req) };
}
