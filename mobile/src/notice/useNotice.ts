import { useEffect, useState } from 'react';

import type { Commute, Evaluation } from '@/contract';
import { lateNotice, noticeFacts, updateNumbers, type NoticeFacts } from '@/notice/template';

/** The notice to send and the numbers it states, for the locked chips. */
export type Notice = NoticeFacts & { text: string };

/**
 * The late notice while the screen is late: Fika's template until the commuter edits it, then their words. An edit is
 * kept with the numbers it was written against, so when the ETA moves its numbers move with it and the message still
 * matches the screen. Once the screen is no longer late, the next late notice starts from the template again.
 */
export function useNotice(evaluation: Evaluation | undefined, contact: Commute['contact']) {
  const [edit, setEdit] = useState<Notice | null>(null);
  const [open, setOpen] = useState(false);
  const late = evaluation?.state === 'late';

  useEffect(() => {
    if (late) return;
    setEdit(null);
    setOpen(false);
  }, [late]);

  const facts = evaluation && late ? noticeFacts(evaluation) : null;
  const notice: Notice | null =
    evaluation && facts
      ? { ...facts, text: edit ? updateNumbers(edit.text, edit, facts) : lateNotice(evaluation, contact) }
      : null;

  return {
    /** Null unless late. */
    notice,
    /** Whether the editor sheet is showing. */
    open,
    show: () => setOpen(notice !== null),
    hide: () => setOpen(false),
    edit: (text: string) => facts && setEdit({ ...facts, text }),
  };
}
