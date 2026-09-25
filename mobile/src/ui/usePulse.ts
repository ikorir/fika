import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const HALF_BREATH_MS = 650;
const breath = { duration: HALF_BREATH_MS, easing: Easing.inOut(Easing.quad) };

/**
 * An opacity style that breathes (full, 0.4, full, every 1.3 s) while `on` and rests at full when it is not: what
 * waiting for Claude's words looks like. Opacity, not movement, so reduce motion leaves it as it is.
 */
export function usePulse(on: boolean) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (!on) return;
    opacity.set(withRepeat(withSequence(withTiming(0.4, breath), withTiming(1, breath)), -1));
    return () => {
      cancelAnimation(opacity);
      opacity.set(1);
    };
  }, [on, opacity]);
  return useAnimatedStyle(() => ({ opacity: opacity.get() }));
}
