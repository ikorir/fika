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

/**
 * The decision line, conditions note and notice for what the screen is showing. Claude writes them; until its
 * answer for these exact facts is here, `words` is null and the screen uses Fika's own template, which states the
 * same numbers. A draft is never shown against facts it was not written for, so the words can never go stale, and
 * a backend that cannot be reached simply leaves the app with its own.
 */
export function useDraft(commute: Commute, evaluation?: Evaluation, simulation?: Simulation): Draft {
  const request = evaluation ? draftRequest(commute, evaluation, simulation) : null;
  const key = request ? JSON.stringify(request) : null;

  const asked = useRef(request);
  asked.current = request;
  const drafts = useRef(new Map<string, DraftResponse>()).current;
  const [, arrived] = useState(0);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const req = asked.current;
    if (key === null || req === null || drafts.has(key)) return;
    let live = true;
    setPending(key);
    fetchDraft(req)
      .then((words) => {
        drafts.set(key, words);
        while (drafts.size > REMEMBERED) drafts.delete(drafts.keys().next().value!);
      })
      .catch(() => {}) // No backend, no Claude: the screen keeps Fika's own words.
      .finally(() => {
        if (!live) return;
        setPending((p) => (p === key ? null : p));
        arrived((n) => n + 1);
      });
    return () => {
      live = false;
    };
  }, [key, drafts]);

  return { words: key === null ? null : (drafts.get(key) ?? null), loading: pending !== null && pending === key };
}
