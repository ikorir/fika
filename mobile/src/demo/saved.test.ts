import { accident, midTrip, startingPoint } from '@/demo/presets';
import { savedRoutes } from '@/demo/saved';
import { evaluate } from '@/engine';
import { seedCommute } from '@/seed';
import { formatTime } from '@/time';

const commute = seedCommute;
const samples = savedRoutes.samples;
const time = (iso: string | null) => (iso ? formatTime(iso) : iso);

// Any clock: the bundled samples carry their own morning, so the demo runs the same on any day.
const anyDay = new Date('2026-09-20T22:00:00+03:00');

describe('the bundled routes response', () => {
  it('runs the stage arc: on time, at risk with the accident, late mid-trip', () => {
    const live = evaluate({ commute, samples, now: anyDay });
    const route = live.routes.find((r) => r.selected)!;
    const start = startingPoint(live);
    const delay = accident(route);

    const arc = [
      start,
      { ...start, delay },
      { ...start, delay, ...midTrip(commute, samples, route.id, delay) },
    ].map((simulation) => evaluate({ commute, samples, now: anyDay, selectedRouteId: route.id, simulation }));

    expect(arc.map((e) => [time(e.now), e.state, time(e.eta), e.simulationLabel])).toEqual([
      ['8:00', 'on_time', '8:49', 'Clock set to 8:00'],
      ['8:00', 'at_risk', '8:55', 'Nairobi Expressway +25 min · Clock set to 8:00'],
      ['8:40', 'late', '9:14', 'Nairobi Expressway +25 min · Clock set to 8:40'],
    ]);
  });

  it('offers a route that gets there on time while at risk, so the presenter can switch', () => {
    const live = evaluate({ commute, samples, now: anyDay });
    const route = live.routes.find((r) => r.selected)!;
    const simulation = { ...startingPoint(live), delay: accident(route) };
    const result = evaluate({ commute, samples, now: anyDay, selectedRouteId: route.id, simulation });

    expect(result.betterRouteId).toBe('james-gichuru-road');
  });
});
