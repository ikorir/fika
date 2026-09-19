// How the notice should sound: the tone it is written in and the language it is written in. The commuter picks
// both in the notice sheet; until they do, the saved contact decides the tone and the language is English.
import { useCallback, useEffect, useState } from 'react';

import type { Commute, DraftRequest } from '@/contract';

export type Tone = DraftRequest['tone'];
export type Language = DraftRequest['language'];
export type Voice = { tone: Tone; language: Language };

/** The segmented tone switch, in the order the design shows it. */
export const TONES: { value: Tone; label: string }[] = [
  { value: 'manager', label: 'Manager' },
  { value: 'friend', label: 'Friend' },
];

/** The language chips, in the order the design shows them. */
export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Swahili' },
  { value: 'sheng', label: 'Sheng' },
];

/** The tone a saved contact suggests: a friend gets the warm one, everyone else the professional one. */
export function defaultTone(relationship: string): Tone {
  return /\b(friend|rafiki|partner|spouse|wife|husband|brother|sister)\b/i.test(relationship) ? 'friend' : 'manager';
}

/** What the notice sounds like before the commuter touches anything. */
export const defaultVoice = (contact: Commute['contact']): Voice => ({
  tone: defaultTone(contact.relationship),
  language: 'en',
});

/**
 * The tone and language the notice is written in. It starts from the saved contact's relationship and follows the
 * contact when that changes, so a commuter who edits their setup does not keep a tone chosen for someone else.
 */
export function useVoice(contact: Commute['contact']) {
  const suggested = defaultTone(contact.relationship);
  const [voice, setVoice] = useState<Voice>({ tone: suggested, language: 'en' });

  useEffect(() => {
    setVoice((v) => (v.tone === suggested ? v : { ...v, tone: suggested }));
    // Only when the saved contact suggests a different tone: their own choice is theirs to keep.
  }, [suggested]);

  return {
    voice,
    setTone: useCallback((tone: Tone) => setVoice((v) => ({ ...v, tone })), []),
    setLanguage: useCallback((language: Language) => setVoice((v) => ({ ...v, language })), []),
  };
}
