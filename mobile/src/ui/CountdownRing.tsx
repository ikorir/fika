import { useEffect } from 'react';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { theme } from '@/theme';
import { useReduceMotion } from '@/ui/useReduceMotion';

const { color, motion } = theme;

const SIZE = 28;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  /** How much of the countdown is still to go, 1 to 0. */
  fraction: number;
};

/**
 * A thin ring that drains as leave-by comes closer (W11, D11): an accent arc from twelve o'clock, as long as the time
 * still to go, on a track in the control colour. It eases from one value to the next; with reduce motion on it shows
 * each value as it is. Decoration only: the words beside it say the same.
 */
export function CountdownRing({ fraction }: Props) {
  const reduceMotion = useReduceMotion();
  const left = useSharedValue(fraction);
  useEffect(() => {
    // `set`, not `.value =`, so the React Compiler can still compile this component.
    left.set(reduceMotion ? fraction : withTiming(fraction, { duration: motion.duration.slow, easing: motion.easing }));
  }, [left, fraction, reduceMotion]);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: CIRCUMFERENCE * (1 - left.get()) }));

  return (
    <Svg
      testID="countdown-ring"
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{ transform: [{ rotate: '-90deg' }] }} // the arc starts at twelve o'clock
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle
        testID="countdown-track"
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke={color.control}
        strokeWidth={STROKE}
      />
      <AnimatedCircle
        testID="countdown-arc"
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke={color.accent}
        strokeWidth={STROKE}
        strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        animatedProps={arc}
      />
    </Svg>
  );
}
