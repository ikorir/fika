import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import type { RouteView, Toll } from '@/contract';
import { theme } from '@/theme';
import { formatTime } from '@/time';
import { useMotion } from '@/ui/motion';
import { Press } from '@/ui/Press';
import { RollingDigits } from '@/ui/RollingDigits';
import { Skeleton } from '@/ui/Skeleton';
import { LARGE_TEXT_CAP } from '@/ui/useFontScale';
import { useReduceMotion } from '@/ui/useReduceMotion';

const { color, type, motion } = theme;

// The check's spring: quick, with one small overshoot.
const checkSpring = { duration: motion.duration.base, dampingRatio: 0.6 };

const deltaColor: Record<RouteView['deltaKind'], string> = {
  early: color.onTime,
  tight: color.atRisk,
  late: color.late,
};

/** "Toll KES 170–500": the range, since the fare depends on where the car joins and leaves the road. */
const tollText = ({ fromKes, toKes }: Toll) => `Toll KES ${fromKes === toKes ? fromKes : `${fromKes}–${toKes}`}`;

function deltaText(deltaMin: number): string {
  if (deltaMin === 0) return 'right on time';
  return deltaMin < 0 ? `${-deltaMin} min early` : `${deltaMin} min late`;
}

type Props = {
  routes: RouteView[];
  caption: string; // the departure the list is computed for: "leaving now, 7:45"
  onSelect?: (routeId: string) => void;
};

// The card fades in when routes first show, and moves rather than jumps when what is above it changes height.
export function RouteList({ routes, caption, onSelect }: Props) {
  const { enter, exit, layout } = useMotion();
  return (
    <Animated.View testID="route-card" entering={enter} exiting={exit} layout={layout} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} maxFontSizeMultiplier={LARGE_TEXT_CAP}>
          Routes
        </Text>
        <Text style={styles.leaving} maxFontSizeMultiplier={LARGE_TEXT_CAP}>
          {caption}
        </Text>
      </View>
      {routes.map((r, i) => (
        // Keyed by route, so a new order or a new selection moves the rows instead of redrawing them in place.
        <Animated.View key={r.id} testID="route-row" layout={layout}>
          {i > 0 && <View style={styles.divider} />}
          <Press
            accessibilityRole="radio"
            accessibilityState={{ selected: r.selected }}
            haptic="select"
            onPress={() => onSelect?.(r.id)}
            style={styles.row}
          >
            <Radio selected={r.selected} />
            <View style={styles.body}>
              <View style={styles.nameLine}>
                {/* One line, cut with an ellipsis, so a long name never pushes the arrival column off the screen. */}
                <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={LARGE_TEXT_CAP}>
                  {r.label}
                </Text>
                {r.recommended && (
                  <Text style={styles.best} maxFontSizeMultiplier={LARGE_TEXT_CAP}>
                    Best
                  </Text>
                )}
              </View>
              <Text style={styles.meta} maxFontSizeMultiplier={LARGE_TEXT_CAP}>
                {r.durationMin} min
                {r.trafficDelayMin > 0 ? ` · ${r.trafficDelayMin} min traffic delay` : ''}
                {r.toll ? ` · ${tollText(r.toll)}` : ''}
              </Text>
            </View>
            <View style={styles.end}>
              <RollingDigits text={formatTime(r.arriveAt)} style={styles.arrive} maxFontSizeMultiplier={LARGE_TEXT_CAP} />
              <Text style={[styles.delta, { color: deltaColor[r.deltaKind] }]} maxFontSizeMultiplier={LARGE_TEXT_CAP}>
                {deltaText(r.deltaMin)}
              </Text>
            </View>
          </Press>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const PLACEHOLDER_ROWS = [0, 1, 2];

/**
 * The route card while the first routes load: the real card with three placeholder rows at the real row height, each
 * with the radio, name and meta lines and the arrival column. It fades out when the routes arrive.
 */
export function RouteListSkeleton() {
  const { exit } = useMotion();
  return (
    <Skeleton>
      <Animated.View
        testID="route-card-skeleton"
        exiting={exit}
        style={styles.card}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.header}>
          <View style={styles.titleLine}>
            <Skeleton.Block width={56} height={12} radius={4} />
          </View>
        </View>
        {PLACEHOLDER_ROWS.map((i) => (
          <View key={i}>
            {i > 0 && <View style={styles.divider} />}
            <View testID="route-row-skeleton" style={styles.row}>
              <Skeleton.Block width={22} height={22} radius={11} />
              <View style={styles.placeholderBody}>
                <Skeleton.Block width="64%" height={14} radius={4} />
                <Skeleton.Block width="40%" height={10} radius={4} />
              </View>
              <View style={styles.placeholderEnd}>
                <Skeleton.Block width={40} height={14} radius={4} />
                <Skeleton.Block width={64} height={10} radius={4} />
              </View>
            </View>
          </View>
        ))}
      </Animated.View>
    </Skeleton>
  );
}

/**
 * A grey ring, or the orange disc with its tick when selected. Selecting a route springs its disc in from nothing;
 * with reduce motion on it is simply there, and a list that first shows with a route selected shows it at rest.
 */
function Radio({ selected }: { selected: boolean }) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    // From 1 to 1 on a first show, so only a change of selection moves; deselected, it goes at once.
    if (!selected) scale.set(0);
    else scale.set(reduceMotion ? 1 : withSpring(1, checkSpring));
  }, [scale, selected, reduceMotion]);
  const grow = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <View style={styles.radio}>
      {!selected && <View style={[styles.mark, styles.radioOff]} />}
      <Animated.View testID="radio-check" pointerEvents="none" style={[styles.mark, styles.radioOn, grow]}>
        <View style={styles.check} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.space.screen,
    borderRadius: theme.radius.card,
    backgroundColor: color.surface,
    paddingVertical: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: theme.space.cardPad,
  },
  title: { ...type.cardTitle, color: color.text },
  leaving: { ...type.meta, color: color.textMuted },
  divider: { height: 1, marginLeft: 50, backgroundColor: color.hairline },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: theme.size.routeRow,
    paddingVertical: 8,
    paddingHorizontal: theme.space.cardPad,
  },
  radio: { width: 22, height: 22 },
  // The ring and the disc each fill the radio.
  mark: { ...StyleSheet.absoluteFill, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: color.accent },
  radioOff: { borderWidth: 2, borderColor: color.radioIdle },
  // A tick drawn from two borders of a rotated box.
  check: {
    width: 6,
    height: 11,
    marginTop: -2,
    borderRightWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: color.onAccent,
    transform: [{ rotate: '45deg' }],
  },
  body: { flex: 1, gap: 2 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { ...type.rowTitle, color: color.text, flexShrink: 1 },
  best: {
    ...type.tag,
    color: color.onAccentTint,
    backgroundColor: color.accentTint,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 9,
    overflow: 'hidden',
  },
  meta: { ...type.meta, color: color.textMuted },
  end: { alignItems: 'flex-end', gap: 2 },
  arrive: { ...type.rowTime, color: color.text },
  delta: type.metaStrong,
  // The placeholder's lines, spaced like the texts they stand for.
  titleLine: { height: 18, justifyContent: 'center' },
  placeholderBody: { flex: 1, gap: 8 },
  placeholderEnd: { alignItems: 'flex-end', gap: 8 },
});
