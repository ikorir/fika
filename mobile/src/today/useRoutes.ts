import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchRoutes } from '@/api';
import type { Commute, RoutesResponse } from '@/contract';
import { savedRoutes } from '@/demo/saved';
import { commuteDeadline, nairobiTimeOnDay } from '@/time';
import { loadLastRoutes, saveLastRoutes } from '@/today/lastRoutes';

/**
 * Routes for the commute: fetched on mount, and again on every refresh — the header button, waking the app, and
 * tapping a reminder. Nothing polls in between. The last response stays on screen and on the phone, so a fetch that
 * fails shows the numbers Fika last had instead of nothing.
 *
 * `saved` puts the bundled response in its place and stops it asking for anything at all, so the demo runs with the
 * phone in airplane mode. Turning it back off fetches again.
 */
export function useRoutes(commute: Commute, saved = false) {
  const [data, setData] = useState<RoutesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Waking the app and tapping a reminder can both ask at once, and each fetch is six billed Google calls, so a
  // second ask joins the one already in flight instead of starting another.
  const inFlight = useRef<Promise<void> | null>(null);

  const fetchNow = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const arriveBy = commuteDeadline(commute.arriveBy, new Date());
      const fetched = await fetchRoutes({
        origin: commute.origin.location,
        destination: commute.destination.location,
        arriveBy,
        usualDeparture: nairobiTimeOnDay(commute.usualDeparture, new Date(arriveBy)),
      });
      setData(fetched);
      await saveLastRoutes(commute, fetched);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [commute]);

  const refresh = useCallback(() => {
    if (saved) return Promise.resolve(); // the bundled response is already here, and there may be no network at all
    if (inFlight.current) return inFlight.current;
    const fetching = fetchNow().finally(() => {
      inFlight.current = null;
    });
    inFlight.current = fetching;
    return fetching;
  }, [fetchNow, saved]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // An edited commute: what is on screen belongs to the old one, so it goes, and the phone's copy takes its place
  // only if it was fetched for this commute. It never replaces a response that has already arrived.
  useEffect(() => {
    setData(null);
    let live = true;
    loadLastRoutes(commute).then((last) => {
      if (live && last) setData((shown) => shown ?? last);
    });
    return () => {
      live = false;
    };
  }, [commute]);

  // Saved routes are never half-there and never fail, so nothing that belongs to a fetch is reported while they are on.
  if (saved) return { data: savedRoutes, error: null, loading: false, refresh };
  return { data, error, loading, refresh };
}
