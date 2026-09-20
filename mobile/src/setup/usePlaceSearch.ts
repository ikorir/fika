import { useEffect, useState } from 'react';

import { searchPlaces } from '@/api';
import type { PlaceSuggestion } from '@/contract';

// Long enough that a typed word only costs one call, short enough that the list keeps up with the typing.
const DEBOUNCE_MS = 300;
const MIN_QUERY = 2; // the backend answers with nothing below this

type Answered = { to: string; suggestions: PlaceSuggestion[]; error: string | null };

/** Places to pick from for what the commuter has typed so far. Each keystroke replaces the search before it. */
export function usePlaceSearch(query: string) {
  const q = query.trim();
  const tooShort = q.length < MIN_QUERY;
  const [answered, setAnswered] = useState<Answered>({ to: '', suggestions: [], error: null });

  useEffect(() => {
    if (tooShort) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { suggestions } = await searchPlaces(q, controller.signal);
        if (!controller.signal.aborted) setAnswered({ to: q, suggestions, error: null });
      } catch (e) {
        if (!controller.signal.aborted)
          setAnswered({ to: q, suggestions: [], error: e instanceof Error ? e.message : String(e) });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, tooShort]);

  // The last answer stays on screen while the next one is in flight, so the list does not blink on every
  // keystroke; the spinner says it is out of date. Clearing the field clears the list.
  const fresh = answered.to === q;
  return {
    suggestions: tooShort ? [] : answered.suggestions,
    searching: !tooShort && !fresh,
    error: fresh ? answered.error : null,
  };
}
