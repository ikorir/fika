import type { Commute, Route, Sample } from '@/contract';
import { accident, midTrip } from '@/demo/presets';
import { evaluate } from '@/engine';
import { lateNotice, updateNumbers } from '@/notice/template';
import { heroText } from '@/today/words';

// Deadline 9:00, buffer 10, extra 5.
const commute: Commute = {
  origin: { placeId: '', label: 'Kangemi', location: { lat: -1.264, lng: 36.747 } },
  destination: { placeId: '', label: 'Upper Hill', location: { lat: -1.2985, lng: 36.8155 } },
  arriveBy: '09:00',
  usualDeparture: '08:20',
  bufferMin: 10,
  extraMin: 5,
  mode: 'drive',
  contact: { name: 'Mary', phone: '254700000000', relationship: 'manager' },
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
