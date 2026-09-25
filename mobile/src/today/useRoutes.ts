import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchRoutes } from '@/api';
import type { Commute, RoutesRequest, RoutesResponse } from '@/contract';
import { savedRoutes } from '@/demo/saved';
import { commuteDeadline, nairobiTimeOnDay } from '@/time';
import { loadLastRoutes, saveLastRoutes } from '@/today/lastRoutes';

/**
 * What the routes are fetched for at `now`: the deadline the screen is about, and the usual departure on its day. The
 * background reminder (W12) asks for exactly this too.
 */
export function routesRequest(commute: Commute, now: Date): RoutesRequest {
  const arriveBy = commuteDeadline(commute.arriveBy, now);
  return {
    origin: commute.origin.location,
    destination: commute.destination.location,
    arriveBy,
    usualDeparture: nairobiTimeOnDay(commute.usualDeparture, new Date(arriveBy)),
  };
}

/**
 * Routes for the commute — the day's effective commute (D5), which the Today screen passes in: fetched on mount, and
 * again on every refresh — the header button, waking the app, and tapping a reminder. Nothing polls in between. The
 * last response stays on screen and on the phone, so a fetch that fails shows the numbers Fika last had instead of
 * nothing.
 *
 * `saved` puts the bundled response in its place and stops it asking for anything at all, so the demo runs with the
 * phone in airplane mode. Turning it back off fetches again.
 */
export function useRoutes(commute: Commute, saved = false) {
  const [data, setData] = useState<RoutesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Waking the app and tapping a reminder can both ask at once, and each fetch is six billed Google calls, so a
  // second ask for the same commute joins the one already in flight instead of starting another.
  const inFlight = useRef<{ commute: Commute; fetching: Promise<void> } | null>(null);
  // The commute on screen now. An edited commute, or the day turning to one with its own arrive-by, can land while
  // the last one's fetch is still out; that fetch's answer belongs to a commute no longer shown, so it is dropped.
  const shown = useRef(commute);
  useEffect(() => {
    shown.current = commute;
  }, [commute]);

  const fetchNow = useCallback(async () => {
    const current = () => shown.current === commute;
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchRoutes(routesRequest(commute, new Date()));
      if (!current()) return;
      setData(fetched);
      await saveLastRoutes(commute, fetched);
    } catch (e) {
      if (current()) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (current()) setLoading(false);
    }
  }, [commute]);

  const refresh = useCallback(() => {
    if (saved) return Promise.resolve(); // the bundled response is already here, and there may be no network at all
    if (inFlight.current?.commute === commute) return inFlight.current.fetching;
    const fetching = fetchNow().finally(() => {
      if (inFlight.current?.fetching === fetching) inFlight.current = null;
    });
    inFlight.current = { commute, fetching };
    return fetching;
  }, [commute, fetchNow, saved]);

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
