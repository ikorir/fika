// The late notice as a fixed English template: the words Fika offers when Claude's aren't there (#7).
// Every number in it comes from the Evaluation, formatted as the screen formats it. It names no cause: with live data
// there is none to give.
import type { Commute, Evaluation } from '@/contract';
import { formatTime } from '@/time';

/** The numbers a notice states, as the screen shows them: ETA "9:15", about 15 minutes late. */
export type NoticeFacts = { eta: string; lateMin: number };

export const noticeFacts = (e: Evaluation): NoticeFacts => ({ eta: formatTime(e.eta), lateMin: e.lateMinRounded });

export function lateNotice(e: Evaluation, contact: Commute['contact']): string {
  const name = contact.name.trim();
  const { eta, lateMin } = noticeFacts(e);
  return `Hi${name ? ` ${name}` : ''}, I will be about ${lateMin} minutes late. My ETA is ${eta}. Apologies for the delay.`;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A notice the commuter edited against `from`, with its ETA and lateness moved to `to`, so what they send still
 * matches the screen. Only the numbers as the template wrote them change ("9:08", "10 minutes"); their words stay.
 */
export function updateNumbers(text: string, from: NoticeFacts, to: NoticeFacts): string {
  return text
    .replace(new RegExp(`(^|[^\\d:])${escape(from.eta)}(?![\\d:])`, 'g'), `$1${to.eta}`)
    .replace(new RegExp(`\\b${from.lateMin} minutes\\b`, 'g'), `${to.lateMin} minutes`);
}
