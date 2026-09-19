// What Fika asks Claude to put into words: the facts the engine already computed, as the strings the screen shows.
// Nothing here works anything out. Every number is copied from the Evaluation, formatted the way the hero and the
// locked chips format it, so what Claude writes can only ever say what the commuter is already looking at.
import type { Commute, DraftRequest, Evaluation, Simulation } from '@/contract';
import { noticeFacts } from '@/notice/template';
import { formatClock, formatTime } from '@/time';
import { routeName } from '@/today/words';

/** The tone a saved contact suggests. The commuter can change it in the notice sheet (#8). */
export function defaultTone(relationship: string): DraftRequest['tone'] {
  return /\b(friend|rafiki|partner|spouse|wife|husband|brother|sister)\b/i.test(relationship) ? 'friend' : 'manager';
}

export function draftRequest(commute: Commute, e: Evaluation, simulation?: Simulation): DraftRequest {
  const selected = e.routes.find((r) => r.selected);
  const recommended = e.routes.find((r) => r.recommended);
  const better = e.routes.find((r) => r.id === e.betterRouteId);
  // Null once the departure the screen is about has arrived: Claude is then writing about leaving now, or about a
  // trip already under way, not about a time still ahead.
  const leaveBy = Date.parse(e.departAt) > Date.parse(e.now) ? formatTime(e.departAt) : null;

  return {
    state: e.state,
    facts: {
      deadline: formatClock(commute.arriveBy),
      leaveBy,
      // Demo mode's mid-trip: the departure is behind the clock, so there is nothing left to tell them to do.
      onTheRoad: Date.parse(e.departAt) < Date.parse(e.now),
      eta: noticeFacts(e).eta,
      lateMin: e.lateMin,
      lateMinRounded: e.lateMinRounded,
      // Empty once the usual departure has gone by: there is no projection left to talk about.
      usualDeparture: e.usual ? formatTime(e.usual.departAt) : '',
      usualArrival: e.usual ? formatTime(e.usual.arriveAt) : '',
      selectedRoute: selected ? routeName(selected) : '',
      recommendedRoute: recommended ? routeName(recommended) : '',
      // Only the engine decides that switching restores on time, so only it can be said.
      betterRoute: better ? routeName(better) : null,
      routes: e.routes.map((r) => ({
        label: routeName(r),
        durationMin: r.durationMin,
        trafficDelayMin: r.trafficDelayMin,
      })),
      // The only cause Fika ever has is the one Demo mode simulates. With live data there is none, so none is sent
      // and Claude has nothing to name.
      ...(simulation?.delay?.cause ? { cause: simulation.delay.cause } : {}),
    },
    recipient: { name: commute.contact.name, relationship: commute.contact.relationship },
    tone: defaultTone(commute.contact.relationship),
    language: 'en',
  };
}
