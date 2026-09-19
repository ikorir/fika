// The late notice as fixed templates: the words Fika offers when Claude's aren't there (#7), in the tone and
// language the commuter picked (#8). Every number in them comes from the Evaluation, formatted as the screen
// formats it. They name no cause: with live data there is none to give. The backend keeps the same six notices in
// backend/lib/draft-template.ts, word for word, so it makes no difference to the commuter which one answered.
import type { Commute, Evaluation } from '@/contract';
import { defaultVoice, type Voice } from '@/notice/voice';
import { formatTime } from '@/time';

/** The numbers a notice states, as the screen shows them: ETA "9:15", about 15 minutes late. */
export type NoticeFacts = { eta: string; lateMin: number };

export const noticeFacts = (e: Evaluation): NoticeFacts => ({ eta: formatTime(e.eta), lateMin: e.lateMinRounded });

type Written = (p: { name: string; minutes: number; eta: string }) => string;

// Sheng is Nairobi's street mix: Swahili sentences with English words left in.
const NOTICE: Record<Voice['language'], Record<Voice['tone'], Written>> = {
  en: {
    manager: ({ name, minutes, eta }) =>
      `Hi${name}, I will be about ${minutes} minutes late. My ETA is ${eta}. Apologies for the delay.`,
    friend: ({ name, minutes, eta }) =>
      `Hey${name}, I'm running about ${minutes} minutes late. Should be there by ${eta}. Sorry about that.`,
  },
  sw: {
    manager: ({ name, minutes, eta }) =>
      `Habari${name}, nitachelewa kwa takriban dakika ${minutes}. Nitafika ${eta}. Samahani kwa usumbufu.`,
    friend: ({ name, minutes, eta }) =>
      `Niaje${name}, nitachelewa kama dakika ${minutes}. Nitafika ${eta}. Pole kwa kukuchelewesha.`,
  },
  sheng: {
    manager: ({ name, minutes, eta }) =>
      `Sasa${name}, niko late kwa dakika ${minutes} hivi. Nafika ${eta}. Pole sana.`,
    friend: ({ name, minutes, eta }) => `Niaje${name}, niko late kama dakika ${minutes}. Nafika ${eta}. Pole manze.`,
  },
};

export function lateNotice(e: Evaluation, contact: Commute['contact'], voice: Voice = defaultVoice(contact)): string {
  const name = contact.name.trim();
  const { eta, lateMin } = noticeFacts(e);
  return NOTICE[voice.language][voice.tone]({ name: name ? ` ${name}` : '', minutes: lateMin, eta });
}

/**
 * The notice to offer: Claude's words when they state the ETA the screen is showing, Fika's own otherwise. The
 * backend checks the same thing before it answers; this is the app's own guard, so a message the commuter is about
 * to send under their name can never name a time they are not arriving at.
 */
export function noticeText(
  e: Evaluation,
  contact: Commute['contact'],
  draft?: string,
  voice: Voice = defaultVoice(contact),
): string {
  return draft && draft.includes(noticeFacts(e).eta) ? draft : lateNotice(e, contact, voice);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A notice the commuter edited against `from`, with its ETA and lateness moved to `to`, so what they send still
 * matches the screen. Only the numbers as a template wrote them change — "9:08", "10 minutes", "dakika 10" — and
 * their own words stay.
 */
export function updateNumbers(text: string, from: NoticeFacts, to: NoticeFacts): string {
  return text
    .replace(new RegExp(`(^|[^\\d:])${escape(from.eta)}(?![\\d:])`, 'g'), `$1${to.eta}`)
    .replace(new RegExp(`\\b${from.lateMin} minutes\\b`, 'g'), `${to.lateMin} minutes`)
    .replace(new RegExp(`\\bdakika ${from.lateMin}\\b`, 'g'), `dakika ${to.lateMin}`);
}
