import { useEffect, useState } from 'react';

// The clock for the engine, ticking so "in 25 min" and leave-by stay current while the screen is open.
// It also re-reads the time whenever `fresh` changes, so newly fetched routes are never older than "now".
export function useNow(fresh?: unknown, intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [fresh, intervalMs]);
  return now;
}
