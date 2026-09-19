import { useState } from 'react';

import type { Commute, Evaluation } from '@/contract';
import { lateNotice } from '@/notice/template';
import { formatTime } from '@/time';

/** A notice and the numbers in it, for the locked chips. `template` is what Fika drafted; `text` is what gets sent. */
export type Notice = { eta: string; lateMin: number; template: string; text: string };

/**
 * The late notice while the screen is late. The editor works on a copy taken when it opens, so the minute ticking
 * over can't rewrite the message under the commuter's thumbs. Their edit is kept for as long as Fika's draft is
 * unchanged; once the ETA moves, the next draft starts from the new numbers.
 */
export function useNotice(evaluation: Evaluation | undefined, contact: Commute['contact']) {
  const [draft, setDraft] = useState<Notice | null>(null);
  const [open, setOpen] = useState(false);

  const template = evaluation?.state === 'late' ? lateNotice(evaluation, contact) : null;
  const current: Notice | null =
    evaluation && template
      ? {
          eta: formatTime(evaluation.eta),
          lateMin: evaluation.lateMinRounded,
          template,
          text: draft?.template === template ? draft.text : template,
        }
      : null;

  return {
    /** What the preview card shows: null unless late. */
    current,
    /** What the editor shows: the copy taken when it opened. */
    draft,
    open,
    show() {
      if (!current) return;
      setDraft(current);
      setOpen(true);
    },
    hide: () => setOpen(false),
    edit: (text: string) => setDraft((d) => d && { ...d, text }),
  };
}

export type NoticeState = ReturnType<typeof useNotice>;
