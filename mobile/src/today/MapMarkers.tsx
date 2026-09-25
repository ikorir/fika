// What sits on the map's routes: the origin and destination pins, an ETA bubble on each route and the simulated
// accident. MapArea places them; these draw them.
import { type ReactNode, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { theme } from '@/theme';
import { bubblePath, withAlpha } from '@/today/marks';
import { useReduceMotion } from '@/ui/useReduceMotion';

const { color } = theme;

const RING = 2; // the black gap between a pin and its halo
const HALO = 4; // the soft outer ring, at 30% of the pin's colour

/**
 * A pin with a 2 pt ring in the screen's black and a soft halo in its own colour, so it reads over any road. Like every
 * marker body here, one view that React Native never folds away, so Apple Maps keeps its layers in order.
 */
function Pin({ tint, children }: { tint: string; children: ReactNode }) {
  return (
    <View testID="pin-halo" collapsable={false} style={[styles.halo, { backgroundColor: withAlpha(tint, 0.3) }]}>
      <View testID="pin-ring" style={styles.ring}>
        {children}
      </View>
    </View>
  );
}

export function OriginPin() {
  return (
    <Pin tint={color.text}>
      <View style={styles.origin} />
    </Pin>
  );
}

export function DestinationPin() {
  return (
    <Pin tint={color.accent}>
      <View style={styles.destination}>
        <View style={styles.destinationCore} />
      </View>
    </Pin>
  );
}

export type BubbleTone = 'selected' | 'left' | 'idle';

const TAIL = 5; // how far the tail reaches below the bubble, to the road

/** The anchor that puts an ETA bubble's tail tip on its route. */
export const BUBBLE_ANCHOR = { x: 0.5, y: 1 };

/**
 * How long a route takes, in a bubble whose tail points at the road. The outline is one SVG path drawn to the
 * measured size of the label, so it fits whatever the text size makes the label.
 *
 * On Apple Maps a marker stacks each view it is given on top of the last, whatever its place among its siblings, and
 * React Native folds a view that only lays out into its parent. So the bubble is one view that is never folded
 * (`collapsable={false}`), and the SVG is there from the first frame, empty until the label is measured: the shape
 * can never land over the text.
 */
export function EtaBubble({ minutes, tone }: { minutes: number; tone: BubbleTone }) {
  const [box, setBox] = useState<{ width: number; height: number }>();
  const look = bubbles[tone];
  return (
    <View testID="eta-bubble" collapsable={false} style={styles.bubble}>
      <Svg testID="eta-bubble-shape" width={box?.width ?? 0} height={box ? box.height + TAIL : 0} style={styles.bubbleShape}>
        {box && <Path d={bubblePath(box.width, box.height, look.radius, TAIL)} fill={look.fill} />}
      </Svg>
      <View
        style={look.box}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setBox((was) => (was && was.width === width && was.height === height ? was : { width, height }));
        }}
      >
        {/* A map annotation, not body text: it barely grows with the phone's text size, so bubbles don't pile up. */}
        <Text style={look.text} maxFontSizeMultiplier={1.2}>
          {minutes} min
        </Text>
      </View>
    </View>
  );
}

const INCIDENT = 30; // the accident's disc
const PULSE_SCALE = 1.8; // how far its ring spreads before it fades
const PULSE_MS = 1200; // one ring, from the disc's edge out to nothing
const STILL = 0.5; // where the ring rests with reduce motion: half out, faint
const INCIDENT_BOX = INCIDENT * PULSE_SCALE; // room for the ring at its widest

/**
 * The anchor that hangs the accident's disc just below its route, 0.2 of the disc under the point, as before the ring
 * gave it a wider box. An ETA bubble rides above its line, so the two never cover each other.
 */
export const INCIDENT_ANCHOR = { x: 0.5, y: ((INCIDENT_BOX - INCIDENT) / 2 - 0.2 * INCIDENT) / INCIDENT_BOX };

/**
 * The simulated accident: a warning disc with a ring that keeps spreading out and fading while it is on the map, which
 * is only while an accident is simulated. With reduce motion the ring holds still, half out.
 */
export function IncidentMarker({ late }: { late: boolean }) {
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(reduceMotion ? STILL : 0);
  useEffect(() => {
    if (reduceMotion) {
      pulse.set(STILL);
      return;
    }
    pulse.set(withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.out(Easing.quad) }), -1, false));
    return () => {
      cancelAnimation(pulse);
      pulse.set(0);
    };
  }, [reduceMotion, pulse]);
  const ring = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - pulse.get()),
    transform: [{ scale: 1 + (PULSE_SCALE - 1) * pulse.get() }],
  }));
  const tint = late ? color.late : color.atRisk;
  return (
    <View testID="incident" collapsable={false} style={styles.incidentBox}>
      <Animated.View testID="incident-pulse" style={[styles.incidentRing, { backgroundColor: tint }, ring]} />
      <View style={[styles.incident, { backgroundColor: tint }]}>
        <Svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke={late ? color.lateTint : color.atRiskTint}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="M12 4 2.5 20h19zM12 10v5M12 17.5v.5" />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: { padding: HALO, borderRadius: 999 },
  ring: { padding: RING, borderRadius: 999, backgroundColor: color.bg },
  origin: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#000000', borderWidth: 3, borderColor: color.text },
  destination: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationCore: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: color.onAccent },
  bubble: { paddingBottom: TAIL },
  bubbleShape: { position: 'absolute', left: 0, top: 0 },
  incidentBox: { width: INCIDENT_BOX, height: INCIDENT_BOX, alignItems: 'center', justifyContent: 'center' },
  incidentRing: { position: 'absolute', width: INCIDENT, height: INCIDENT, borderRadius: INCIDENT / 2 },
  incident: { width: INCIDENT, height: INCIDENT, borderRadius: INCIDENT / 2, alignItems: 'center', justifyContent: 'center' },
});

// The three looks an ETA bubble has, with the colours and sizes it had as a plain box.
const bubbles = {
  idle: {
    fill: color.control,
    radius: 11,
    box: { paddingHorizontal: 9, paddingVertical: 3 },
    text: { ...theme.type.segment, fontSize: 12, color: color.textChip },
  },
  // The road the accident is on, once switched away from.
  left: {
    fill: color.atRiskTint,
    radius: 11,
    box: { paddingHorizontal: 9, paddingVertical: 3 },
    text: { ...theme.type.segment, fontSize: 12, color: color.atRisk },
  },
  selected: {
    fill: color.accent,
    radius: 12,
    box: { paddingHorizontal: 10, paddingVertical: 4 },
    text: { ...theme.type.metaStrong, fontFamily: theme.font.bold, color: color.onAccent },
  },
} as const;
