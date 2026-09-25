import type { Simulation } from '@/contract';
import { savedCommute, savedRoutes, scriptSteps, type Step } from '@/demo/saved';
import { evaluate } from '@/engine';
import { explain } from '@/engine/explain';
import { departureWindow } from '@/engine/window';
import { formatTime } from '@/time';

const commute = savedCommute;
const samples = savedRoutes.samples;
const steps = scriptSteps(commute, samples, new Date('2026-09-20T22:00:00+03:00'));
const step = (scenario: Step['scenario']) => steps.find((s) => s.scenario === scenario)!;

const chosenTimes = (x: ReturnType<typeof explain>) => x.rows.filter((r) => r.chosen).map((r) => formatTime(r.departAt));
const accident = step('at_risk').simulation.delay;
/** The saved routes with Limuru Road's accident, the clock at `hhmm`, and the given route on screen. */
const withAccidentAt = (hhmm: string, selectedRouteId?: string) => {
  const simulation: Simulation = { delay: accident, clock: `2026-09-21T${hhmm}:00+03:00` };
  const evaluation = evaluate({ commute, samples, now: new Date(), selectedRouteId, simulation });
  return { evaluation, simulation };
};

describe('explain', () => {
  it('gives the rule as numbers: deadline, buffer and the extra minutes, named for driving', () => {
    const { evaluation, simulation } = step('on_time');
    const x = explain(evaluation, commute, samples, simulation);
    expect(formatTime(x.deadline)).toBe('9:00');
    expect([x.bufferMin, x.extraMin, x.extraLabel]).toEqual([10, 10, 'parking']);
  });

  it('names the extra minutes the pickup wait for ride-hail', () => {
    const { evaluation } = step('on_time');
    expect(explain(evaluation, { ...commute, mode: 'ride_hail' }, samples).extraLabel).toBe('pickup');
  });

  it('lists every departure checked, exactly as the departure window does', () => {
    const { evaluation, simulation } = step('at_risk');
    expect(explain(evaluation, commute, samples, simulation).rows).toEqual(
      departureWindow(samples, commute, evaluation, simulation),
    );
  });

  it('on time: picks the latest departure that gets in before the buffer', () => {
    const { evaluation, simulation } = step('on_time');
    const x = explain(evaluation, commute, samples, simulation);
    expect([x.reason, chosenTimes(x)]).toEqual(['latest_on_time', ['7:50']]);
  });

  it('at risk on the stage: leave now, as 7:30 is still the latest departure on time (by the Expressway)', () => {
    const { evaluation, simulation } = step('at_risk');
    expect(evaluation.state).toBe('at_risk');
    const x = explain(evaluation, commute, samples, simulation);
    expect([x.reason, chosenTimes(x)]).toEqual(['latest_on_time', ['7:30']]);
  });

  it('at risk: leave now, when no departure gets in before the buffer any more but now still makes the deadline', () => {
    const { evaluation, simulation } = withAccidentAt('07:50', 'nairobi-expressway');
    expect(evaluation.state).toBe('at_risk');
    const x = explain(evaluation, commute, samples, simulation);
    expect([x.reason, chosenTimes(x)]).toEqual(['leave_now_inside_buffer', ['7:50']]);
  });

  it('late: leave now, when no route makes the deadline', () => {
    const { evaluation, simulation } = withAccidentAt('08:00');
    expect(evaluation.state).toBe('late');
    const x = explain(evaluation, commute, samples, simulation);
    expect([x.reason, chosenTimes(x)]).toEqual(['no_route_on_time', ['8:00']]);
  });

  it('late, mid-trip: on the road, from the departure already made', () => {
    const { evaluation, simulation } = step('late');
    expect(evaluation.state).toBe('late');
    const x = explain(evaluation, commute, samples, simulation);
    expect([x.reason, chosenTimes(x)]).toEqual(['on_the_road', ['7:50']]);
  });
});
