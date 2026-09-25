import { createContext, type ReactNode, useContext, useEffect } from 'react';
import type { DimensionValue } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  makeMutable,
  type SharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '@/theme';
import { useReduceMotion } from '@/ui/useReduceMotion';

const { color, motion } = theme;

// One shimmer for the whole app, 0 at the surface colour and 1 at the raised surface, so every block on screen
// brightens and dims in phase, whichever Skeleton it sits in and whenever it appeared. It runs while any Skeleton that
// moves is on screen, and rests at 0 otherwise.
const shimmer = makeMutable(0);
const moving = { skeletons: 0 };
// What the blocks read with reduce motion on: the surface colour, held.
const still = makeMutable(0);

const Shimmer = createContext<SharedValue<number>>(still);

/**
 * Placeholder blocks for content that is still loading, drawn at the content's real size. Every `Skeleton.Block`
 * inside reads the one shared shimmer value; with reduce motion on the blocks hold still.
 */
export function Skeleton({ children }: { children: ReactNode }) {
  const reduceMotion = useReduceMotion();
  useEffect(() => {
    if (reduceMotion) return;
    moving.skeletons += 1;
    if (moving.skeletons === 1) {
      const half = { duration: motion.duration.slow * 2, easing: Easing.inOut(Easing.quad) };
      shimmer.set(withRepeat(withTiming(1, half), -1, true));
    }
    return () => {
      moving.skeletons -= 1;
      if (moving.skeletons === 0) {
        cancelAnimation(shimmer);
        shimmer.set(0);
      }
    };
  }, [reduceMotion]);
  return <Shimmer.Provider value={reduceMotion ? still : shimmer}>{children}</Shimmer.Provider>;
}

type BlockProps = { width: DimensionValue; height: number; radius: number; testID?: string };

/** One placeholder block, its colour moving between the surface and the raised surface with the shimmer. */
function Block({ width, height, radius, testID }: BlockProps) {
  const phase = useContext(Shimmer);
  const shade = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(phase.get(), [0, 1], [color.surface, color.surfaceRaised]),
  }));
  return <Animated.View testID={testID} style={[{ width, height, borderRadius: radius }, shade]} />;
}

Skeleton.Block = Block;
