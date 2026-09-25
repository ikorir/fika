import { useState } from 'react';
import { Pressable, type PressableProps, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { theme } from '@/theme';
import * as haptics from '@/ui/haptics';
import { useReduceMotion } from '@/ui/useReduceMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const { duration, easing, pressScale } = theme.motion;
const PRESSED_OPACITY = 0.85;

export type PressProps = PressableProps & {
  /** A haptic from `ui/haptics` to give on each press, before `onPress` runs. */
  haptic?: 'select';
};

/**
 * The app's one pressable (D3). While a finger is down it dips to `pressScale` and dims to 85%, so every tap answers
 * back; with reduce motion on it only dims. Every Pressable prop passes through, a function style included; Press owns
 * the transform, and dims from the style's own opacity. A disabled Press never animates. The hit area reaches 8 pt past
 * the edges unless `hitSlop` says otherwise.
 */
export function Press({ style, disabled, hitSlop = 8, haptic, onPress, onPressIn, onPressOut, ...rest }: PressProps) {
  const reduceMotion = useReduceMotion();
  // Only a function style needs to know, so only a function style re-renders; the animation runs on the shared value.
  const [pressed, setPressed] = useState(false);
  const styleFollowsPress = typeof style === 'function';
  const down = useSharedValue(0);

  const own = styleFollowsPress ? style({ pressed, hovered: false }) : style;
  // Pressing dims from whatever opacity the style already has, such as a dimmed disabled button.
  const flat = StyleSheet.flatten(own);
  const restOpacity = typeof flat?.opacity === 'number' ? flat.opacity : 1;
  const animated = useAnimatedStyle(() => ({
    opacity: restOpacity * (1 - down.get() * (1 - PRESSED_OPACITY)),
    transform: [{ scale: reduceMotion ? 1 : 1 - down.get() * (1 - pressScale) }],
  }));

  // `set`, not `.value =`, so the React Compiler can still compile this component.
  const to = (value: number) => down.set(withTiming(value, { duration: duration.fast, easing }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={
        haptic
          ? (e) => {
              haptics[haptic]();
              onPress?.(e);
            }
          : onPress
      }
      onPressIn={(e) => {
        if (disabled) return;
        if (styleFollowsPress) setPressed(true);
        to(1);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (styleFollowsPress) setPressed(false);
        to(0);
        onPressOut?.(e);
      }}
      style={[own, animated]}
    />
  );
}
