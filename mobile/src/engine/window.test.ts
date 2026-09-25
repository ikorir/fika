import type { Sample } from '@/contract';
import { savedCommute, savedRoutes, scriptSteps, type Step } from '@/demo/saved';
import { deltaKind, evaluate } from '@/engine';
import { departureWindow } from '@/engine/window';
import { formatTime } from '@/time';

const commute = savedCommute;
const samples = savedRoutes.samples;
// Any clock: the bundled samples carry their own morning (Monday 21 September 2026), so the script is the same any day.
const steps = scriptSteps(commute, samples, new Date('2026-09-20T22:00:00+03:00'));
const step = (scenario: Step['scenario']) => steps.find((s) => s.scenario === scenario)!;
const blocksFor = (s: Step, from: Sample[] = samples) => departureWindow(from, commute, s.evaluation, s.simulation);

const shown = (blocks: ReturnType<typeof departureWindow>) =>
  blocks.map((b) => [formatTime(b.departAt), formatTime(b.arriveAt), b.route, b.kind, b.chosen]);

describe('deltaKind', () => {
  // Deadline 9:00 with a 10 min buffer: on time means arriving by 8:50.
  const deadline = '2026-09-21T09:00:00+03:00';
  const at = (hhmm: string) => `2026-09-21T${hhmm}:00+03:00`;

  it.each([
    ['08:30', 'early'],
    ['08:50', 'early'],
    ['08:51', 'tight'],
    ['09:00', 'tight'],
    ['09:01', 'late'],
  ])('calls an arrival at %s %s', (hhmm, kind) => {
    expect(deltaKind(at(hhmm), deadline, 10)).toBe(kind);
  });

  it('adds the extra minutes to an arrival that does not include them yet', () => {
    expect(deltaKind(at('08:45'), deadline, 10, 5)).toBe('early');
    expect(deltaKind(at('08:46'), deadline, 10, 5)).toBe('tight');
    expect(deltaKind(at('08:56'), deadline, 10, 5)).toBe('late');
  });
});

describe('departureWindow on the saved routes', () => {
  it('gives one block per departure Fika checked, in time order, the evaluated one raised', () => {
    expect(shown(blocksFor(step('on_time')))).toEqual([
      ['7:15', '8:13', 'via Limuru Road', 'early', false],
      ['7:30', '8:29', 'via Limuru Road', 'early', false],
      ['7:50', '8:49', 'via Limuru Road', 'early', true],
      ['8:00', '8:58', 'via Limuru Road', 'tight', false],
      ['8:15', '9:13', 'via Limuru Road', 'late', false],
    ]);
  });

  it('gives six blocks for a live response’s six samples, sorted whatever order they came in', () => {
    // A live response also carries the departure "now"; this one arrives last in the list.
    const now: Sample = { departAt: '2026-09-21T04:05:00.000Z', kind: 'now', routes: samples[0].routes };
    const blocks = blocksFor(step('on_time'), [...samples].reverse().concat(now));
    expect(blocks.map((b) => formatTime(b.departAt))).toEqual(['7:05', '7:15', '7:30', '7:50', '8:00', '8:15']);
  });

  it('recolours with Demo mode’s simulated delay, and raises the departure the clock makes it', () => {
    // Limuru Road +25 min at 7:30: the Expressway is best everywhere, and leave-by moves up to 7:30, which is now.
    expect(shown(blocksFor(step('at_risk')))).toEqual([
      ['7:15', '8:19', 'via Nairobi Expressway', 'early', false],
      ['7:30', '8:34', 'via Nairobi Expressway', 'early', true],
      ['7:50', '8:53', 'via Nairobi Expressway', 'tight', false],
      ['8:00', '9:02', 'via Nairobi Expressway', 'late', false],
      ['8:15', '9:16', 'via Nairobi Expressway', 'late', false],
    ]);
  });

  it('raises the departure already made once on the road', () => {
    const chosen = blocksFor(step('late')).filter((b) => b.chosen);
    expect(chosen.map((b) => formatTime(b.departAt))).toEqual(['7:50']);
  });

  it.each(['on_time', 'at_risk', 'late'] as const)(
    'gives each block the arrival, route and kind evaluate() gives the best route leaving then (%s)',
    (scenario) => {
      const s = step(scenario);
      for (const block of blocksFor(s)) {
        // Leaving exactly at the block's time: on the road from that departure, with the clock still at it.
        const e = evaluate({
          commute,
          samples,
          now: new Date(block.departAt),
          simulation: {
            delay: s.simulation.delay,
            clock: block.departAt,
            midTrip: { routeId: 'limuru-road', departedAt: block.departAt },
          },
        });
        const best = e.routes.find((r) => r.recommended)!;
        expect([block.arriveAt, block.route, block.kind]).toEqual([best.arriveAt, best.label, best.deltaKind]);
      }
    },
  );

  it('leaves out a sample with no routes', () => {
    const empty: Sample = { departAt: '2026-09-21T04:40:00.000Z', kind: 'step', routes: [] };
    const blocks = blocksFor(step('on_time'), [...samples, empty]);
    expect(blocks.map((b) => formatTime(b.departAt))).toEqual(['7:15', '7:30', '7:50', '8:00', '8:15']);
  });

  it('raises no block when the departure is not one Fika checked', () => {
    // With the accident, leave-by was 7:30; at 7:37 the screen says to leave now, which falls between samples.
    const simulation = { delay: step('at_risk').simulation.delay };
    const e = evaluate({ commute, samples, now: new Date('2026-09-21T07:37:00+03:00'), simulation });
    expect(departureWindow(samples, commute, e, simulation).some((b) => b.chosen)).toBe(false);
  });
});
