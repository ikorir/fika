import { useCallback, useEffect, useState } from 'react';

import { fetchRoutes } from '@/api';
import type { Commute, RoutesResponse } from '@/contract';
import { commuteDeadline, nairobiTimeOnDay } from '@/time';

// Routes for the commute, fetched on mount and on refresh. Refresh on foreground and on notification tap is #11.
export function useRoutes(commute: Commute) {
  const [data, setData] = useState<RoutesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const arriveBy = commuteDeadline(commute.arriveBy, new Date());
      setData(
        await fetchRoutes({
          origin: commute.origin.location,
          destination: commute.destination.location,
          arriveBy,
          usualDeparture: nairobiTimeOnDay(commute.usualDeparture, new Date(arriveBy)),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [commute]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, error, loading, refresh };
}
