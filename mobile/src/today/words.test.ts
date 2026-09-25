import type { Evaluation, RouteView } from '@/contract';
import { savedCommute, savedRoutes, scriptSteps, type Step } from '@/demo/saved';
import { evaluate } from '@/engine';
import { type Explanation, explain } from '@/engine/explain';
import { holidayLine, morningBody, ruleLine, whyReason, whyTitle } from '@/today/words';

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

describe('the words for "Why this time" (W2)', () => {
  const samples = savedRoutes.samples;
  const steps = scriptSteps(savedCommute, samples, new Date('2026-09-20T22:00:00+03:00'));
  const step = (scenario: Step['scenario']) => steps.find((s) => s.scenario === scenario)!;
  const why = ({ evaluation, simulation }: Pick<Step, 'evaluation' | 'simulation'>) =>
    explain(evaluation, savedCommute, samples, simulation);
  const accidentAt = (hhmm: string) => {
    const simulation = { delay: step('at_risk').simulation.delay, clock: `2026-09-21T${hhmm}:00+03:00` };
    return { evaluation: evaluate({ commute: savedCommute, samples, now: new Date(), simulation }), simulation };
  };

  it('titles the sheet with the leave-by, or with leaving now', () => {
    expect(whyTitle(step('on_time').evaluation)).toBe('Why leave by 7:50');
    expect(whyTitle(step('at_risk').evaluation)).toBe('Why leave now');
  });

  it('states the rule in one line', () => {
    const x = why(step('on_time'));
    expect(ruleLine(x)).toBe('Arrive by 9:00, minus 10 min buffer and 10 min parking');
    expect(ruleLine({ ...x, extraLabel: 'pickup', extraMin: 5 })).toBe(
      'Arrive by 9:00, minus 10 min buffer and 5 min pickup wait',
    );
    expect(ruleLine({ ...x, bufferMin: 0 })).toBe('Arrive by 9:00, minus 10 min parking');
    expect(ruleLine({ ...x, bufferMin: 0, extraMin: 0 })).toBe('Arrive by 9:00');
  });

  it.each<[Explanation['reason'], () => Pick<Step, 'evaluation' | 'simulation'>, string]>([
    ['latest_on_time', () => step('on_time'), '7:50 is the latest time Fika checked that still gets you there by 8:50, before your buffer.'],
    ['latest_on_time', () => step('at_risk'), 'Leaving now is the latest time Fika checked that still gets you there by 8:50, before your buffer.'],
    ['leave_now_inside_buffer', () => accidentAt('07:50'), 'No time Fika checked gets you there by 8:50 any more, but leaving now still makes 9:00, inside your buffer.'],
    ['no_route_on_time', () => accidentAt('08:00'), 'No route gets you there by 9:00 any more, so leaving now makes you as little late as it can.'],
    ['on_the_road', () => step('late'), 'You left at 7:50, so Fika works out your arrival from the part of the trip still ahead.'],
  ])('gives %s its sentence', (reason, at, sentence) => {
    const s = at();
    const x = why(s);
    expect(x.reason).toBe(reason);
    expect(whyReason(x, s.evaluation)).toBe(sentence);
  });
});
