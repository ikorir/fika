import type { Evaluation, RouteView } from '@/contract';
import { holidayLine, morningBody } from '@/today/words';

const route = (label: string, over: Partial<RouteView> = {}): RouteView => ({
  id: label.toLowerCase().replace(/ /g, '-'),
  label: `via ${label}`,
  durationMin: 40,
  trafficDelayMin: 0,
  arriveAt: '2026-09-24T08:30:00+03:00',
  deltaMin: -30,
  deltaKind: 'early',
  recommended: false,
  selected: false,
  polyline: '',
  ...over,
});

const evaluation = (state: Evaluation['state'], routes: RouteView[], over: Partial<Evaluation> = {}): Evaluation => ({
  state,
  now: '2026-09-24T06:30:00.000Z',
  departAt: '2026-09-24T04:45:00.000Z', // 7:45 in Nairobi
  leaveBy: '2026-09-24T04:45:00.000Z',
  remindAt: '2026-09-24T04:35:00.000Z',
  eta: '2026-09-24T05:30:00.000Z',
  lateMin: 0,
  lateMinRounded: 0,
  usual: null,
  routes,
  betterRouteId: null,
  noRouteOnTime: false,
  simulated: false,
  simulationLabel: null,
  ...over,
});

describe('morningBody', () => {
  it('on time, names the leave-by and the road', () => {
    const e = evaluation('on_time', [route('Limuru Road', { selected: true, recommended: true }), route('Kiambu Road')]);
    expect(morningBody(e)).toBe('Leave by 7:45 today via Limuru Road.');
  });

  it('at risk, says to leave now and which road the traffic is on', () => {
    const e = evaluation('at_risk', [route('Limuru Road'), route('Kiambu Road', { selected: true, trafficDelayMin: 20 })]);
    expect(morningBody(e)).toBe('Leave now: traffic on Kiambu Road.');
  });

  it('late, says a message is ready', () => {
    const e = evaluation('late', [route('Kiambu Road', { selected: true })], { lateMin: 12, lateMinRounded: 15 });
    expect(morningBody(e)).toBe("You're likely late today. Fika has a message ready.");
  });
});

describe('holidayLine', () => {
  it('names the holiday and says there is no reminder', () => {
    expect(holidayLine('Christmas Day')).toBe('Public holiday: Christmas Day. No reminder today.');
  });
});
