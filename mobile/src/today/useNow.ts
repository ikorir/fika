import { useEffect, useState } from 'react';

const TICK_MS = 30_000;

// The clock for the engine, ticking so "in 25 min" and leave-by stay current while the screen is open.
// It also re-reads the time when new routes arrive, so they are never evaluated against an older "now".
export function useNow(routes: unknown): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, [routes]);
  return now;
}
