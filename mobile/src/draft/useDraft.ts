import { useEffect, useRef, useState } from 'react';

import { fetchDraft } from '@/api';
import type { Commute, DraftRequest, DraftResponse, Evaluation, Simulation } from '@/contract';
import { draftRequest } from '@/draft/request';

// Claude's words are asked for once per set of facts. Enough of them are kept that going back to a screen already
// drafted — switching route and back, stepping the demo clock back — is instant instead of another call.
const REMEMBERED = 12;

export type Draft = {
  /** Claude's words for exactly the facts on screen, or null while the app has only its own. */
  words: DraftResponse | null;
  /** A draft for these facts is on its way. */
  loading: boolean;
};

/** The words Claude wrote, against the facts it wrote them for. */
type Written = { key: string; words: DraftResponse };

/**
 * The decision line, conditions note and notice for what the screen is showing. Claude writes them; until its
 * answer for these exact facts is here, `words` is null and the screen uses Fika's own template, which states the
 * same numbers. A draft is never shown against facts it was not written for, so the words can never go stale, and
 * a backend that cannot be reached simply leaves the app with its own.
 */
export function useDraft(commute: Commute, evaluation?: Evaluation, simulation?: Simulation): Draft {
  // The facts, and the same facts written down as the key they are remembered under. One is the other, which is why
  // the effect can read the request back out of the key instead of closing over a value that has since moved on.
  const key = evaluation ? JSON.stringify(draftRequest(commute, evaluation, simulation)) : null;

  const remembered = useRef(new Map<string, DraftResponse>());
  const [written, setWritten] = useState<Written | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (key === null) return;
    const known = remembered.current.get(key);
    if (known) {
      setWritten({ key, words: known });
      return;
    }

    let live = true;
    const abandon = new AbortController();
    setPending(key);
    fetchDraft(JSON.parse(key) as DraftRequest, abandon.signal)
      .then((words) => {
        const cache = remembered.current;
        cache.set(key, words);
        while (cache.size > REMEMBERED) cache.delete(cache.keys().next().value!);
        if (live) setWritten({ key, words });
      })
      .catch(() => {}) // No backend, no Claude: the screen keeps Fika's own words, and asks again next time.
      .finally(() => {
        if (live) setPending((p) => (p === key ? null : p));
      });
    return () => {
      live = false;
      abandon.abort(); // The facts have moved on; these words would be about a screen that is gone.
    };
  }, [key]);

  // Only Claude's words are offered. When the backend answered with its own template the app prefers its own,
  // which knows the commute — the destination by name, that no other route gets there on time.
  const claude = written?.key === key && written.words.source === 'claude' ? written.words : null;
  return { words: key === null ? null : claude, loading: key !== null && pending === key };
}
