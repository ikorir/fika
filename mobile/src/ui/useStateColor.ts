import { useEffect } from 'react';
import { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { Evaluation } from '@/contract';
import { theme } from '@/theme';

const { color, motion } = theme;

/** Where each state sits on the one value its colours tween along: on time 0, at risk 1, late 2. */
export const stateIndex: Record<Evaluation['state'], number> = { on_time: 0, at_risk: 1, late: 2 };

const steps = [0, 1, 2];
const tints = [color.onTimeTint, color.atRiskTint, color.lateTint];
const colors = [color.onTime, color.atRisk, color.late];
// Plain white on time, the state colour otherwise: the hero time only takes a colour when something is wrong.
const alerts = [color.text, color.atRisk, color.late];

/**
 * The state colours as animated styles, all driven by one shared value that tweens over `motion.duration.base` when
 * the state changes, so the pill, its dot and the hero time move from green to amber to red together. The first
 * state is shown as it is, with no tween. A colour change is not movement, so it tweens with reduce motion on too.
 *
 * - `background`: the state's tint as a background (the pill).
 * - `foreground`: the state's colour as a text colour (the pill label).
 * - `fill`: the state's colour as a background (the pill's dot).
 * - `alert`: white on time, the state's colour otherwise, as a text colour (the hero time).
 */
export function useStateColor(state: Evaluation['state']) {
  const index = useSharedValue(stateIndex[state]);
  useEffect(() => {
    // `set`, not `.value =`, so the React Compiler can still compile the component using this.
    index.set(withTiming(stateIndex[state], { duration: motion.duration.base, easing: motion.easing }));
  }, [index, state]);

  const background = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(index.get(), steps, tints) }));
  const foreground = useAnimatedStyle(() => ({ color: interpolateColor(index.get(), steps, colors) }));
  const fill = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(index.get(), steps, colors) }));
  const alert = useAnimatedStyle(() => ({ color: interpolateColor(index.get(), steps, alerts) }));
  return { background, foreground, fill, alert };
}
