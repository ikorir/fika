// Why this time (W2): the numbers behind an evaluation's departure, for the screen to put into words. Pure; no prose
// here, only numbers and a reason key.
import type { Commute, Evaluation, Sample, Simulation } from '@/contract';
import { departureWindow, evaluationDeadline, type WindowBlock } from '@/engine/window';

/**
 * - `latest_on_time`: the departure is the latest one checked that gets in before the buffer (leaving now, when that
 *   is now or leaving now still does).
 * - `leave_now_inside_buffer`: no route leaving now gets in before the buffer, but one still makes the deadline.
 * - `no_route_on_time`: no route leaving now makes the deadline.
 * - `on_the_road`: the trip is under way (Demo mode's mid-trip), so the departure is the one already made.
 */
export type WhyReason = 'latest_on_time' | 'leave_now_inside_buffer' | 'no_route_on_time' | 'on_the_road';

export type Explanation = {
  deadline: string; // ISO
  bufferMin: number;
  extraMin: number;
  extraLabel: 'parking' | 'pickup'; // what the extra minutes are, by mode
  rows: WindowBlock[]; // every departure checked, earliest first; the evaluated one is `chosen`
  reason: WhyReason;
};

const REASON_BY_KIND = {
  early: 'latest_on_time',
  tight: 'leave_now_inside_buffer',
  late: 'no_route_on_time',
} as const satisfies Record<WindowBlock['kind'], WhyReason>;

/**
 * The rule the evaluation applied and every departure it weighed. The reason follows the best route at the evaluated
 * departure, the one the rows mark: the departure is the leave-by while that is ahead, and now once it is not, so it
 * is the latest on time for as long as anything is. Pass the evaluation's `simulation` so Demo mode's delay counts.
 */
export function explain(
  evaluation: Evaluation,
  commute: Commute,
  samples: Sample[],
  simulation?: Simulation,
): Explanation {
  const best = evaluation.routes.find((r) => r.recommended) ?? evaluation.routes[0];
  const onTheRoad = Date.parse(evaluation.departAt) < Date.parse(evaluation.now);
  return {
    deadline: evaluationDeadline(evaluation),
    bufferMin: commute.bufferMin,
    extraMin: commute.extraMin,
    extraLabel: commute.mode === 'drive' ? 'parking' : 'pickup',
    rows: departureWindow(samples, commute, evaluation, simulation),
    reason: onTheRoad ? 'on_the_road' : REASON_BY_KIND[best.deltaKind],
  };
}
