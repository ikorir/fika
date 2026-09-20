import { useCallback, useEffect, useState } from 'react';

import { fetchRoutes } from '@/api';
import type { Commute, RoutesResponse } from '@/contract';
import { commuteDeadline, nairobiTimeOnDay } from '@/time';
import { loadLastRoutes, saveLastRoutes } from '@/today/lastRoutes';

/**
 * Routes for the commute: fetched on mount, and again on every refresh — the header button, waking the app, and
 * tapping a reminder. Nothing polls in between. The last response stays on screen and on the phone, so a fetch that
 * fails shows the numbers Fika last had instead of nothing.
 */
export function useRoutes(commute: Commute) {
  const [data, setData] = useState<RoutesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
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

  useEffect(() => {
    refresh();
  }, [refresh]);

  // The phone's copy, for a first fetch that fails. It never replaces a response that has already arrived.
  useEffect(() => {
    let live = true;
    loadLastRoutes(commute).then((last) => {
      if (live && last) setData((shown) => shown ?? last);
    });
    return () => {
      live = false;
    };
  }, [commute]);

  return { data, error, loading, refresh };
}
