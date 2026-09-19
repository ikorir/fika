import { useEffect, useState } from 'react';

import type { Commute, Evaluation } from '@/contract';
import { noticeFacts, noticeText, updateNumbers, type NoticeFacts } from '@/notice/template';
import { defaultVoice, type Voice } from '@/notice/voice';

/** The notice to send and the numbers it states, for the locked chips. */
export type Notice = NoticeFacts & { text: string };

/**
 * The late notice while the screen is late: the words Claude wrote for these facts, or Fika's own template, until
 * the commuter edits it, and then their words. An edit is kept with the numbers it was written against, so when the
 * ETA moves its numbers move with it and the message still matches the screen — and a draft arriving afterwards
 * never takes their words away. Once the screen is no longer late, the next notice starts fresh.
 */
export function useNotice(
  evaluation: Evaluation | undefined,
  contact: Commute['contact'],
  draft?: string,
  voice: Voice = defaultVoice(contact),
) {
  const [edit, setEdit] = useState<Notice | null>(null);
  const [open, setOpen] = useState(false);
  const late = evaluation?.state === 'late';

  useEffect(() => {
    if (late) return;
    setEdit(null);
    setOpen(false);
  }, [late]);

  // Asking for another tone or language is asking to be written a new message, so the old one goes — the only
  // thing that takes the commuter's own words away, and only because they asked for it.
  useEffect(() => setEdit(null), [voice.tone, voice.language]);

  const facts = evaluation && late ? noticeFacts(evaluation) : null;
  const notice: Notice | null =
    evaluation && facts
      ? { ...facts, text: edit ? updateNumbers(edit.text, edit, facts) : noticeText(evaluation, contact, draft, voice) }
      : null;

  return {
    /** Null unless late. */
    notice,
    /** Whether the editor sheet is showing. */
    open,
    /** Whether the words are the commuter's own, and so no longer Fika's or Claude's to change. */
    mine: edit !== null,
    show: () => {
      if (!notice) return;
      // What they read when they open the editor is what they will send. Taking it as theirs from that moment
      // stops a draft landing a second later from rewriting the message under them.
      setEdit(notice);
      setOpen(true);
    },
    hide: () => setOpen(false),
    edit: (text: string) => facts && setEdit({ ...facts, text }),
  };
}
