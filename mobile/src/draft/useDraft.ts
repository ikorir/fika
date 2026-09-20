import { useEffect, useState } from 'react';

import { fetchDraft } from '@/api';
import type { Commute, DraftRequest, DraftResponse, Evaluation, Simulation } from '@/contract';
import { savedDraft } from '@/demo/saved';
import { draftRequest } from '@/draft/request';
import type { Voice } from '@/notice/voice';

// Claude's words are asked for once per set of facts. Enough of them are kept that going back to a screen already
// drafted — switching route and back, flipping the tone to friend and back, stepping the demo clock back — is
// instant instead of another call. Six voices across the three states fit.
const REMEMBERED = 18;

// Shared by every useDraft on screen, not held per hook: the hero and the notice ask for the same words whenever
// the commuter has not switched the voice, and that must be one call, not two.
const remembered = new Map<string, DraftResponse>();
const asking = new Map<string, Promise<DraftResponse>>();

/**
 * The words for these facts, from the backend or from a call already on its way. A call is never cancelled — it is
 * not one screen's to cancel — but a caller ignores any answer for facts it is no longer showing.
 */
function ask(key: string): Promise<DraftResponse> {
  const already = asking.get(key);
  if (already) return already;
  const call = fetchDraft(JSON.parse(key) as DraftRequest)
    .then((words) => {
      remembered.set(key, words);
      while (remembered.size > REMEMBERED) remembered.delete(remembered.keys().next().value!);
      return words;
    })
    .finally(() => asking.delete(key));
  asking.set(key, call);
  return call;
}

export type Draft = {
  /** Claude's words for exactly the facts on screen, or null while the app has only its own. */
  words: DraftResponse | null;
  /** A draft for these facts is on its way. */
  loading: boolean;
};

/** The words Claude wrote, against the facts it wrote them for. */
type Written = { key: string; words: DraftResponse };

/**
 * The decision line, conditions note and notice for what the screen is showing, in the voice asked for. Claude
 * writes them; until its answer for these exact facts is here, `words` is null and the screen uses Fika's own
 * template, which states the same numbers in the same language. A draft is never shown against facts it was not
 * written for, so the words can never go stale, and a backend that cannot be reached simply leaves the app with
 * its own.
 *
 * `saved` is Demo mode running on the bundled response: the words for those screens were written before the demo
 * and are already on the phone, so nothing is asked for and nothing can hang on venue wifi.
 */
export function useDraft(
  commute: Commute,
  evaluation?: Evaluation,
  simulation?: Simulation,
  voice?: Voice,
  saved = false,
): Draft {
  // The facts, and the same facts written down as the key they are remembered under. One is the other, which is why
  // the effect can read the request back out of the key instead of closing over a value that has since moved on.
  const key = evaluation ? JSON.stringify(draftRequest(commute, evaluation, simulation, voice)) : null;

  const [written, setWritten] = useState<Written | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (key === null) return;

    // Running on saved routes: the words were written before the demo, so nothing is asked for and nothing can
    // hang on venue wifi. With none saved for this screen the app uses its own, as it does with no backend.
    if (saved) {
      const words = savedDraft(JSON.parse(key) as DraftRequest);
      if (words) setWritten({ key, words });
      return;
    }

    const known = remembered.get(key);
    if (known) {
      setWritten({ key, words: known });
      return;
    }

    let live = true;
    setPending(key);
    ask(key)
      .then((words) => {
        if (live) setWritten({ key, words });
      })
      .catch(() => {}) // No backend, no Claude: the screen keeps Fika's own words, and asks again next time.
      .finally(() => {
        if (live) setPending((p) => (p === key ? null : p));
      });
    return () => {
      live = false; // The facts have moved on; these words would be about a screen that is gone.
    };
  }, [key, saved]);

  // Only Claude's words are offered. When the backend answered with its own template the app prefers its own,
  // which knows the commute — the destination by name, that no other route gets there on time.
  const claude = written?.key === key && written.words.source === 'claude' ? written.words : null;
  // Nothing is ever waited for on saved routes, so nothing on that screen can be left spinning.
  return { words: key === null ? null : claude, loading: !saved && key !== null && pending === key };
}
