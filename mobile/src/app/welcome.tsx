// First run: what Fika does, in one line, and two ways in. Shown once, on a phone with no commute stored; the root
// layout decides (store/welcomed.ts) and takes it away for good when the commuter picks either way in.
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useWelcomed } from '@/store/welcomed';
import { theme } from '@/theme';
import { useMotion } from '@/ui/motion';
import { Press } from '@/ui/Press';

const { color, type } = theme;

// The app icon's glyph, as drawn in assets/source/fika-glyph.svg: a clock whose hand runs out of it as a road.
const GLYPH = ['M51.21 75.54A30 30 0 1 1 74.19 56.26', 'M46 46V30', 'M46 46C54 50 60 56 64 64S66 80 84 84'];

export default function WelcomeScreen() {
  const { enter } = useMotion();
  const welcomed = useWelcomed();

  const setUp = () => {
    welcomed();
    router.push('/setup');
  };

  return (
    <SafeAreaView testID="welcome" style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.intro}>
        <Animated.View testID="welcome-glyph" entering={enter}>
          <Svg width={88} height={88} viewBox="12 12 76 76" fill="none" stroke={color.accent} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
            {GLYPH.map((d) => (
              <Path key={d} d={d} />
            ))}
          </Svg>
        </Animated.View>
        <Text style={styles.title} accessibilityRole="header">
          Know when to leave.
        </Text>
        <Text style={styles.line}>
          Fika checks the roads, tells you when to go, and writes the message if you’ll be late.
        </Text>
      </View>
      <View style={styles.actions}>
        <Press accessibilityRole="button" onPress={setUp} style={styles.primary}>
          <Text style={styles.primaryLabel}>Set up my commute</Text>
        </Press>
        {/* The layout swaps the welcome for Today, which opens on the seeded commute. */}
        <Press accessibilityRole="button" onPress={welcomed} style={styles.text}>
          <Text style={styles.textLabel}>Try it with a sample commute</Text>
        </Press>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  intro: { flex: 1, justifyContent: 'center', gap: 16, paddingHorizontal: theme.space.heroInset },
  title: { ...type.title, color: color.text, marginTop: 16 },
  line: { ...type.decision, color: color.textMuted },
  actions: { gap: 6, paddingHorizontal: theme.space.screen, paddingBottom: 8 },
  primary: {
    height: theme.size.button,
    borderRadius: theme.radius.pill,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { ...type.button, color: color.onAccent },
  text: { height: theme.size.buttonSecondary, alignItems: 'center', justifyContent: 'center' },
  textLabel: { ...type.buttonSecondary, color: color.accent },
});
