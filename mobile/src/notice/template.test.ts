import type { Commute, Route, Sample } from '@/contract';
import { accident, midTrip } from '@/demo/presets';
import { evaluate } from '@/engine';
import { lateNotice, noticeText, updateNumbers } from '@/notice/template';
import type { Voice } from '@/notice/voice';
import { heroText } from '@/today/words';

// Deadline 9:00, buffer 10, extra 5.
const commute: Commute = {
  version: 2,
  origin: { placeId: '', label: 'Kangemi', location: { lat: -1.264, lng: 36.747 } },
  destination: { placeId: '', label: 'Upper Hill', location: { lat: -1.2985, lng: 36.8155 } },
  arriveBy: '09:00',
  usualDeparture: '08:20',
  bufferMin: 10,
  extraMin: 5,
  mode: 'drive',
  contact: { name: 'Mary', phone: '254700000000', relationship: 'manager' },
  quietWeekends: true,
  contacts: [{ name: 'Mary', phone: '254700000000', relationship: 'manager', tone: 'manager', language: 'en' }],
};

const at = (hhmm: string) => new Date(`2026-09-21T${hhmm.padStart(5, '0')}:00+03:00`);

/** Via Waiyaki Way, taking `min` minutes, `delayMin` of them traffic. */
const waiyaki = (min: number, delayMin = 0): Route => ({
  id: 'waiyaki-way',
  label: 'via Waiyaki Way',
  durationSec: min * 60,
  staticDurationSec: (min - delayMin) * 60,
  distanceM: 10_000,
  polyline: '',
});

/** Leaving now at 8:30 on the one route: arrival is 8:35 + `min`. */
const leavingAt830 = (route: Route) =>
  evaluate({ commute, samples: [{ departAt: at('8:30').toISOString(), kind: 'now', routes: [route] }], now: at('8:30') });

describe('the late notice', () => {
  it.each([
    { min: 40, eta: '9:15', late: 'about 15 minutes late' },
    { min: 38, eta: '9:13', late: 'about 15 minutes late' },
    { min: 26, eta: '9:01', late: 'about 5 minutes late' },
    { min: 41, eta: '9:16', late: 'about 20 minutes late' },
  ])('arriving at $eta says "My ETA is $eta" and "$late"', ({ min, eta, late }) => {
    const e = leavingAt830(waiyaki(min));
    const notice = lateNotice(e, commute.contact);
    expect(heroText(e, commute).value).toBe(eta);
    expect(notice).toContain(`My ETA is ${eta}.`);
    expect(notice).toContain(late);
  });

  it('greets the contact by name', () => {
    expect(lateNotice(leavingAt830(waiyaki(40)), commute.contact)).toBe(
      'Hi Mary, I will be about 15 minutes late. My ETA is 9:15. Apologies for the delay.',
    );
  });

  it('says just "Hi" when the contact has no name', () => {
    const notice = lateNotice(leavingAt830(waiyaki(40)), { ...commute.contact, name: ' ' });
    expect(notice.startsWith('Hi, I will be about 15 minutes late.')).toBe(true);
  });

  it('names no cause, even when the route is slower than normal', () => {
    expect(lateNotice(leavingAt830(waiyaki(40, 25)), commute.contact)).toBe(
      'Hi Mary, I will be about 15 minutes late. My ETA is 9:15. Apologies for the delay.',
    );
  });

  it("reads the stage's mid-trip into the accident with the ETA on screen", () => {
    const samples: Sample[] = [
      { departAt: at('8:00').toISOString(), kind: 'step', routes: [waiyaki(44, 10)] },
      { departAt: at('8:20').toISOString(), kind: 'usual', routes: [waiyaki(50, 10)] },
      { departAt: at('8:30').toISOString(), kind: 'step', routes: [waiyaki(55, 10)] },
    ];
    const delay = accident(evaluate({ commute, samples, now: at('7:40') }).routes[0]);
    const simulation = { delay, ...midTrip(commute, samples, 'waiyaki-way', delay) };
    const e = evaluate({ commute, samples, now: at('7:40'), simulation });
    expect([e.state, heroText(e, commute).value]).toEqual(['late', '9:44']);
    expect(lateNotice(e, commute.contact)).toBe(
      'Hi Mary, I will be about 45 minutes late. My ETA is 9:44. Apologies for the delay.',
    );
  });
});

describe("the commuter's edit when the numbers move", () => {
  const was = { eta: '9:08', lateMin: 10 };
  const now = { eta: '9:13', lateMin: 15 };

  it('keeps their words and takes the new ETA and lateness', () => {
    const edit = 'Hi Mary, I will be about 10 minutes late. My ETA is 9:08. Start the meeting without me.';
    expect(updateNumbers(edit, was, now)).toBe(
      'Hi Mary, I will be about 15 minutes late. My ETA is 9:13. Start the meeting without me.',
    );
  });

  it('leaves other times alone', () => {
    const edit = 'My ETA is 9:08. Start the 19:08 call and the 9:00 meeting without me.';
    expect(updateNumbers(edit, was, now)).toBe('My ETA is 9:13. Start the 19:08 call and the 9:00 meeting without me.');
  });

  it('puts back no number they took out', () => {
    expect(updateNumbers('Running late, sorry!', was, now)).toBe('Running late, sorry!');
  });
});

describe('the notice offered to the commuter', () => {
  const claude = (eta: string) => `Hi Mary, traffic is heavy. I will be about 15 minutes late, arriving ${eta}.`;

  it("is Claude's when it states the ETA on screen", () => {
    const e = leavingAt830(waiyaki(40));
    expect(noticeText(e, commute.contact, claude('9:15'))).toBe(claude('9:15'));
  });

  it("is Fika's own when Claude's states a different ETA", () => {
    const e = leavingAt830(waiyaki(40));
    expect(noticeText(e, commute.contact, claude('9:20'))).toBe(lateNotice(e, commute.contact));
  });

  it("is Fika's own when Claude has not written one", () => {
    const e = leavingAt830(waiyaki(40));
    expect(noticeText(e, commute.contact)).toBe(lateNotice(e, commute.contact));
  });
});

describe('the late notice in each language and tone', () => {
  const voices: Voice[] = [
    { tone: 'manager', language: 'en' },
    { tone: 'friend', language: 'en' },
    { tone: 'manager', language: 'sw' },
    { tone: 'friend', language: 'sw' },
    { tone: 'manager', language: 'sheng' },
    { tone: 'friend', language: 'sheng' },
  ];
  const written = (voice: Voice) => lateNotice(leavingAt830(waiyaki(40)), commute.contact, voice);

  it.each(voices)('states the exact ETA and the rounded lateness in $language, $tone', (voice) => {
    const notice = written(voice);
    expect(notice).toContain('9:15');
    expect(notice).toMatch(/\b15\b/);
    expect(notice).toContain('Mary');
  });

  it('gives every language and tone its own words, so a switch always shows', () => {
    expect(new Set(voices.map(written)).size).toBe(voices.length);
  });

  it('says the same words as the backend template, in the language asked for', () => {
    expect(written({ tone: 'manager', language: 'sw' })).toBe(
      'Habari Mary, nitachelewa kwa takriban dakika 15. Nitafika 9:15. Samahani kwa usumbufu.',
    );
  });

  it('greets without a name when the contact has none', () => {
    const notice = lateNotice(leavingAt830(waiyaki(40)), { ...commute.contact, name: ' ' }, voices[5]);
    expect(notice.startsWith('Niaje, ')).toBe(true);
  });

  it('defaults to English in the tone the saved contact suggests', () => {
    const e = leavingAt830(waiyaki(40));
    expect(lateNotice(e, commute.contact)).toBe(lateNotice(e, commute.contact, { tone: 'manager', language: 'en' }));
    const friend = { ...commute.contact, relationship: 'friend' };
    expect(lateNotice(e, friend)).toBe(lateNotice(e, friend, { tone: 'friend', language: 'en' }));
  });

  it("moves the numbers in a Swahili edit, and keeps the commuter's words", () => {
    const edit = 'Habari Mary, nitachelewa kwa takriban dakika 10. Nitafika 9:08. Anza bila mimi.';
    expect(updateNumbers(edit, { eta: '9:08', lateMin: 10 }, { eta: '9:13', lateMin: 15 })).toBe(
      'Habari Mary, nitachelewa kwa takriban dakika 15. Nitafika 9:13. Anza bila mimi.',
    );
  });

  it("is Fika's own words in the chosen language when Claude has not written any", () => {
    const e = leavingAt830(waiyaki(40));
    const voice: Voice = { tone: 'friend', language: 'sheng' };
    expect(noticeText(e, commute.contact, undefined, voice)).toBe(lateNotice(e, commute.contact, voice));
  });
});
