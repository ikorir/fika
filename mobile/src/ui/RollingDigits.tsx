import { type ComponentProps, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { theme } from '@/theme';
import { alignRight, diffDigits, type Direction, isClockTime } from '@/ui/digits';
import { useReduceMotion } from '@/ui/useReduceMotion';

const { duration, easing } = theme.motion;

type TextStyle = ComponentProps<typeof Animated.Text>['style'];
type Props = { text: string; style?: TextStyle; maxFontSizeMultiplier?: number };
type Roll = { from: string; to: string };

/**
 * A time whose digits roll when it changes, "7:50" to "9:13", instead of being replaced. Each changed digit slides out
 * and the new one slides in over `motion.duration.base`: up when the new digit is larger, down when smaller. Only a
 * change from one clock time to another rolls; anything else, and every change with reduce motion on, swaps at once.
 *
 * The whole text is always laid out, in the style given, so the size never jumps and a change of length ("9:55" to
 * "10:05") takes its new width at once. While digits roll it is hidden under a row of single characters that do the
 * moving, and it comes back when they finish.
 */
export function RollingDigits({ text, style, maxFontSizeMultiplier }: Props) {
  const reduceMotion = useReduceMotion();
  const lineHeight = useSharedValue(0);
  const [shown, setShown] = useState(text);
  const [roll, setRoll] = useState<Roll | null>(null);
  // Decided while rendering, so the frame with the new text is already the first frame of the roll.
  if (text !== shown) {
    setShown(text);
    setRoll(!reduceMotion && isClockTime(shown) && isClockTime(text) ? { from: shown, to: text } : null);
  }
  useEffect(() => {
    if (!roll) return;
    const done = setTimeout(() => setRoll(null), duration.base);
    return () => clearTimeout(done);
  }, [roll]);

  return (
    <View testID="rolling-digits" onLayout={(e) => lineHeight.set(e.nativeEvent.layout.height)}>
      <Animated.Text style={[style, roll ? styles.hidden : undefined]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        {text}
      </Animated.Text>
      {roll && (
        <Rolling
          key={`${roll.from}>${roll.to}`}
          roll={roll}
          style={style}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
          lineHeight={lineHeight}
        />
      )}
    </View>
  );
}

type RollingProps = { roll: Roll; style?: TextStyle; maxFontSizeMultiplier?: number; lineHeight: SharedValue<number> };

// The moving row: one place per character of the new time, over the hidden text. Hidden from screen readers, which
// read the whole text underneath.
function Rolling({ roll, style, maxFontSizeMultiplier, lineHeight }: RollingProps) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(1, { duration: duration.base, easing }));
  }, [progress]);
  const before = alignRight(roll.from, roll.to.length);
  return (
    <View
      testID="rolling"
      style={styles.row}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {diffDigits(roll.from, roll.to).map(({ char, direction }, i) =>
        direction ? (
          <Place
            key={i}
            char={char}
            from={before[i]}
            direction={direction}
            progress={progress}
            lineHeight={lineHeight}
            style={style}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          />
        ) : (
          <Animated.Text key={i} style={style} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {char}
          </Animated.Text>
        ),
      )}
    </View>
  );
}

type PlaceProps = {
  char: string;
  from: string;
  direction: Direction;
  progress: SharedValue<number>;
  lineHeight: SharedValue<number>;
  style?: TextStyle;
  maxFontSizeMultiplier?: number;
};

// One rolling digit, clipped to its line: the new one comes in from below (up) or above (down) as the old one leaves
// the other way. The new digit sets the width.
function Place({ char, from, direction, progress, lineHeight, style, maxFontSizeMultiplier }: PlaceProps) {
  const way = direction === 'up' ? 1 : -1;
  const incoming = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: (1 - progress.get()) * way * lineHeight.get() }],
  }));
  const outgoing = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
    transform: [{ translateY: -progress.get() * way * lineHeight.get() }],
  }));
  return (
    <View style={styles.place}>
      <Animated.Text style={[style, incoming]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        {char}
      </Animated.Text>
      {from !== '' && (
        <Animated.Text style={[style, styles.leaving, outgoing]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {from}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  row: { position: 'absolute', top: 0, left: 0, flexDirection: 'row' },
  place: { overflow: 'hidden' },
  leaving: { position: 'absolute', top: 0, left: 0 },
});
