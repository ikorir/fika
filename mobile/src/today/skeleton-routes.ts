// Temporary: stands in for the commute engine's route list until ticket #4 builds evaluate().
// Delete this file once the screen renders an Evaluation.
import type { Commute, RouteView, Sample } from '@/contract';
import { commuteDeadline } from '@/time';

const MIN = 60_000;

export function skeletonRouteViews(sample: Sample, commute: Commute, selectedRouteId?: string): RouteView[] {
  const departMs = Date.parse(sample.departAt);
  const deadlineMs = Date.parse(commuteDeadline(commute.arriveBy, new Date(sample.departAt)));
  const views = sample.routes.map((r) => {
    const arriveMs = departMs + r.durationSec * 1000 + commute.extraMin * MIN;
    return {
      id: r.id,
      label: r.label,
      durationMin: Math.round(r.durationSec / 60),
      trafficDelayMin: Math.max(0, Math.round((r.durationSec - r.staticDurationSec) / 60)),
      arriveAt: new Date(arriveMs).toISOString(),
      deltaMin: Math.round((arriveMs - deadlineMs) / MIN),
      deltaKind:
        arriveMs <= deadlineMs - commute.bufferMin * MIN ? 'early' : arriveMs <= deadlineMs ? 'tight' : 'late',
      recommended: false,
      selected: false,
      polyline: r.polyline,
    } satisfies RouteView;
  });
  const best = [...views].sort(
    (a, b) => Date.parse(a.arriveAt) - Date.parse(b.arriveAt) || a.trafficDelayMin - b.trafficDelayMin,
  )[0];
  const selected = views.some((v) => v.id === selectedRouteId) ? selectedRouteId : best?.id;
  return views.map((v) => ({ ...v, recommended: v.id === best?.id, selected: v.id === selected }));
}
