import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

const HALF_BREATH_MS = 650;

/** An opacity that breathes while `on` and rests at full when it is not: what waiting for Claude's words looks like. */
export function usePulse(on: boolean) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!on) {
      opacity.setValue(1);
      return;
    }
    const fade = (toValue: number) =>
      Animated.timing(opacity, {
        toValue,
        duration: HALF_BREATH_MS,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
    const loop = Animated.loop(Animated.sequence([fade(0.4), fade(1)]));
    loop.start();
    return () => {
      loop.stop();
      opacity.setValue(1);
    };
  }, [on, opacity]);
  return opacity;
}
