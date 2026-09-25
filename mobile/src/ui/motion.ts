// The entering, exiting and layout animations every screen uses, bound to the motion tokens. With reduce motion on
// each one is undefined, which Reanimated takes as "no animation", so a call site never has to branch.
import { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { theme } from '@/theme';
import { useReduceMotion } from '@/ui/useReduceMotion';

const { duration, easing } = theme.motion;

const presets = {
  enter: FadeInDown.duration(duration.base).easing(easing),
  exit: FadeOut.duration(duration.fast).easing(easing),
  layout: LinearTransition.duration(duration.base).easing(easing),
};

export type Motion = { [K in keyof typeof presets]: (typeof presets)[K] | undefined };

const still: Motion = { enter: undefined, exit: undefined, layout: undefined };

export function useMotion(): Motion {
  return useReduceMotion() ? still : presets;
}
