import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Evaluation } from '@/contract';
import { theme } from '@/theme';

// White strip under the map: "SIMULATED TRAFFIC · WAIYAKI WAY +25 MIN". Shown by the engine's simulated flag and
// nothing else, and it has no way to be dismissed.
export function SimulationBanner({ evaluation }: { evaluation?: Evaluation }) {
  if (!evaluation?.simulated) return null;
  // "+25 MIN" never breaks across lines.
  const text = `Simulated traffic · ${evaluation.simulationLabel}`.toUpperCase().replace(/(\d) MIN\b/g, '$1\u00a0MIN');
  return (
    <View style={styles.banner} accessibilityRole="text">
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={theme.color.onSimBanner} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9" />
      </Svg>
      <Text style={styles.text}>{text}</Text>
    </View>
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
