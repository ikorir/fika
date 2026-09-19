// The late notice as a fixed English template: the words Fika offers when Claude's aren't there (#7).
// Every number in it comes from the Evaluation, formatted as the screen formats it. It names no cause it wasn't
// given: traffic only when the route's traffic delay makes up at least half of the lateness, so a late start
// isn't blamed on the roads.
import type { Commute, Evaluation } from '@/contract';
import { formatTime } from '@/time';
import { routeName } from '@/today/words';

export function lateNotice(e: Evaluation, contact: Commute['contact']): string {
  const route = e.routes.find((r) => r.selected)!;
  const name = contact.name.trim();
  const traffic = route.trafficDelayMin * 2 >= e.lateMin ? `traffic is heavy on ${routeName(route)} and ` : '';
  return (
    `Hi${name ? ` ${name}` : ''}, ${traffic}I will be about ${e.lateMinRounded} minutes late. ` +
    `My ETA is ${formatTime(e.eta)}. Apologies for the delay.`
  );
}
