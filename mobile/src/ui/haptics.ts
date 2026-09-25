// One haptic per moment that matters (PLAN.md, Haptics map). Every call is fire-and-forget: a phone without a haptic
// engine, or a native call that fails, never reaches the screen. Haptics are about touch, not movement, so they do not
// follow reduce motion.
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';

import type { Evaluation } from '@/contract';

type State = Evaluation['state'];

function fire(call: () => Promise<unknown>) {
  try {
    Promise.resolve(call()).catch(() => {});
  } catch {
    // Nothing to do: a missing buzz is not worth an error.
  }
}

/** A route row, a tone or language chip, or a Demo mode scenario was picked. */
export const select = () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/** The one-off reminder was set. Dropping it is silent. */
export const reminderSet = () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

/** The notice is going out on WhatsApp, SMS or the share sheet: called before the other app opens. */
export const sent = () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

/**
 * What the commute changing state feels like: a warning on becoming at risk, an error on becoming late, nothing on
 * getting back on time. Nothing for the first state of a launch (`from` undefined), which is not a change.
 */
export function stateHaptic(from: State | undefined, to: State): 'warning' | 'error' | null {
  if (from === undefined || from === to) return null;
  if (to === 'at_risk') return 'warning';
  if (to === 'late') return 'error';
  return null;
}

export function stateChanged(from: State | undefined, to: State) {
  const haptic = stateHaptic(from, to);
  if (!haptic) return;
  const type = haptic === 'warning' ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Error;
  fire(() => Haptics.notificationAsync(type));
}

/**
 * Buzzes whenever the screen's state changes, simulated changes included. A moment with no evaluation, such as a
 * reload, is not a state: the next one is compared with the last state shown.
 */
export function useStateHaptic(state: State | undefined) {
  const last = useRef<State | undefined>(undefined);
  useEffect(() => {
    if (state === undefined) return;
    stateChanged(last.current, state);
    last.current = state;
  }, [state]);
}
