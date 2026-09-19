import type { Commute, Route, Sample, Simulation } from '@/contract';
import { accident, midTrip } from '@/demo/presets';
import { draftRequest } from '@/draft/request';
import { evaluate } from '@/engine';
import { heroText } from '@/today/words';

// A Monday morning in Nairobi. Deadline 9:00, buffer 10, extra 5: on time means arriving by 8:50.
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

const route = (id: string, min: number, delayMin = 0): Route => ({
  id,
  label: `via ${id}`,
  durationSec: min * 60,
  staticDurationSec: (min - delayMin) * 60,
  distanceM: 10_000,
  polyline: '',
});

const sample = (hhmm: string, routes: Route[], kind: Sample['kind'] = 'step'): Sample => ({
  departAt: at(hhmm).toISOString(),
  kind,
  routes,
});

const waiyaki = (min: number, delayMin = 0) => ({ ...route('waiyaki-way', min, delayMin), label: 'via Waiyaki Way' });
const ngong = (min: number, delayMin = 0) => ({ ...route('ngong-road', min, delayMin), label: 'via Ngong Road' });

const morning = (routes: Route[]) =>
  ['7:45', '8:00', '8:15', '8:20', '8:30'].map((t) => sample(t, routes, t === '8:20' ? 'usual' : 'step'));

const request = (now: string, routes: Route[], simulation?: Simulation) =>
  draftRequest(
    commute,
    evaluate({ commute, samples: [sample(now, routes, 'now'), ...morning(routes)], now: at(now), simulation }),
    simulation,
  );

describe('the facts sent to the draft endpoint', () => {
  it('are the strings the screen is showing', () => {
    const req = request('7:30', [waiyaki(70, 18), ngong(51)]);
    expect(req.facts).toMatchObject({
      deadline: '9:00',
      leaveBy: '7:45',
      usualDeparture: '8:20',
      selectedRoute: 'Ngong Road',
      routes: [
        { label: 'Waiyaki Way', durationMin: 70, trafficDelayMin: 18 },
        { label: 'Ngong Road', durationMin: 51, trafficDelayMin: 0 },
      ],
    });
  });

  it('state the ETA exactly as the hero does, so the notice can be checked against it', () => {
    const e = evaluate({
      commute,
      samples: [sample('8:30', [waiyaki(40)], 'now')],
      now: at('8:30'),
    });
    expect(draftRequest(commute, e).facts.eta).toBe(heroText(e, commute).value);
  });

  it('say to leave now once the departure the screen is about has arrived', () => {
    expect(request('8:30', [waiyaki(40)]).facts.leaveBy).toBeNull();
  });

  it('leave out the usual-time projection once the usual departure has gone by', () => {
    const req = request('8:30', [waiyaki(40)]);
    expect([req.facts.usualDeparture, req.facts.usualArrival]).toEqual(['', '']);
  });

  it('name no cause with live data, so Claude has none to mention', () => {
    expect(request('7:30', [waiyaki(70, 18), ngong(51)]).facts.cause).toBeUndefined();
  });

  it('name the cause Demo mode simulates, and only then', () => {
    const routes = [waiyaki(45), ngong(51)];
    const live = evaluate({ commute, samples: [sample('7:30', routes, 'now'), ...morning(routes)], now: at('7:30') });
    const simulation = { delay: accident(live.routes.find((r) => r.id === 'waiyaki-way')!) };
    expect(request('7:30', routes, simulation).facts.cause).toBe('Accident on Waiyaki Way');
  });

  it('say when the trip is already under way, so Claude does not tell a driver to leave', () => {
    const routes = [waiyaki(45), ngong(51)];
    const samples = [sample('7:30', routes, 'now'), ...morning(routes)];
    const shown = evaluate({ commute, samples, now: at('7:30') });
    const simulation = { ...midTrip(commute, samples, 'waiyaki-way'), delay: accident(shown.routes[0]) };
    const req = draftRequest(commute, evaluate({ commute, samples, now: at('7:30'), simulation }), simulation);
    expect(req.facts.onTheRoad).toBe(true);
    expect(req.facts.leaveBy).toBeNull();
  });

  it('state the exact lateness beside the rounded figure the message promises', () => {
    const e = evaluate({ commute, samples: [sample('8:30', [waiyaki(38)], 'now')], now: at('8:30') });
    const req = draftRequest(commute, e);
    expect([req.facts.lateMin, req.facts.lateMinRounded]).toEqual([13, 15]);
  });

  it('name a better route only when the engine found one, with its own arrival time', () => {
    expect(request('7:30', [waiyaki(40), ngong(51)]).facts.betterRoute).toBeNull();

    // At risk on the road showing (8:30 + 20 + 5 = 8:55), with one that still makes 8:50 (8:30 + 12 + 5 = 8:47).
    const routes = [waiyaki(20), ngong(12)];
    const e = evaluate({ commute, samples: [sample('8:30', routes, 'now')], now: at('8:30'), selectedRouteId: 'waiyaki-way' });
    expect(e.state).toBe('at_risk');
    expect(draftRequest(commute, e).facts.betterRoute).toEqual({ label: 'Ngong Road', arriveAt: '8:47' });
  });

  it('carry the saved contact, and a tone that fits them', () => {
    const req = request('7:30', [waiyaki(40)]);
    expect([req.recipient, req.tone, req.language]).toEqual([{ name: 'Mary', relationship: 'manager' }, 'manager', 'en']);

    const friend = { ...commute, contact: { ...commute.contact, relationship: 'friend' } };
    const e = evaluate({ commute: friend, samples: [sample('8:30', [waiyaki(40)], 'now')], now: at('8:30') });
    expect(draftRequest(friend, e).tone).toBe('friend');
  });
});
