import { StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import type { Evaluation } from '@/contract';
import { theme } from '@/theme';
import { useMotion } from '@/ui/motion';

// White strip under the map: "SIMULATED TRAFFIC · WAIYAKI WAY +25 MIN · SAVED ROUTES". Shown by the engine's
// simulated flag and by the demo running on saved routes, and it has no way to be dismissed. It comes in and goes out
// with the shared presets; a change of wording while it is up just changes the words.
export function SimulationBanner({ evaluation, saved }: { evaluation?: Evaluation; saved?: boolean }) {
  const { enter, exit } = useMotion();
  if (!evaluation?.simulated && !saved) return null;
  // Saved routes are real Google numbers, simply not this morning's, and the judges are owed that too.
  const parts = ['Simulated traffic', evaluation?.simulationLabel, saved && 'Saved routes'].filter(Boolean);
  // "+25 MIN" never breaks across lines.
  const text = parts.join(' · ').toUpperCase().replace(/(\d) MIN\b/g, '$1\u00a0MIN');
  return (
    <Animated.View
      testID="simulation-banner"
      entering={enter}
      exiting={exit}
      style={styles.banner}
      accessibilityRole="text"
    >
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={theme.color.onSimBanner} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9" />
      </Svg>
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 30,
    paddingVertical: 6,
    paddingHorizontal: theme.space.screen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.color.simBanner,
  },
  text: { ...theme.type.banner, color: theme.color.onSimBanner, textAlign: 'center', flexShrink: 1 },
});
