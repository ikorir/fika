import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { theme } from '@/theme';
import { Press } from '@/ui/Press';

const { color } = theme;

// Round buttons floating over the map: edit commute (left); Demo mode and refresh (right).
// The Demo mode icon turns accent orange while Demo mode is on.
type Props = { onRefresh: () => void; onDemo: () => void; demoOn: boolean };

export function HeaderControls({ onRefresh, onDemo, demoOn }: Props) {
  return (
    <View style={styles.bar}>
      <View style={styles.round}>
        <Backdrop />
        <Press accessibilityRole="button" accessibilityLabel="Edit commute" onPress={() => router.push('/setup')} style={styles.roundButton}>
          <Icon>
            <Path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <Circle cx={16} cy={7} r={2} />
            <Circle cx={8} cy={17} r={2} />
          </Icon>
        </Press>
      </View>
      <View style={styles.pill}>
        <Backdrop />
        <Press
          accessibilityRole="button"
          accessibilityLabel={demoOn ? 'Demo mode, on' : 'Demo mode'}
          onPress={onDemo}
          style={styles.pillButton}
        >
          <Icon stroke={demoOn ? color.accent : color.text}>
            <Path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9" />
          </Icon>
        </Press>
        <Press accessibilityRole="button" accessibilityLabel="Refresh routes" onPress={onRefresh} style={styles.pillButton}>
          <Icon>
            <Path d="M20 11a8 8 0 0 0-14.9-3M4 5v3.5h3.5M4 13a8 8 0 0 0 14.9 3M20 19v-3.5h-3.5" />
          </Icon>
        </Press>
      </View>
    </View>
  );
}

/**
 * What a control floats on, inside its hairline border: the map blurred on iOS, the flat dark fill on Android, where
 * a blur costs too much. It sits under the buttons, not in them, so a press dims the icon and never the blur (iOS
 * drops a blur whose view is dimmed).
 */
function Backdrop() {
  return (
    <View testID="control-backdrop" pointerEvents="none" style={[styles.backdrop, Platform.OS !== 'ios' && styles.flat]}>
      {Platform.OS === 'ios' && <BlurView tint="dark" intensity={30} style={styles.blur} />}
    </View>
  );
}

// 22 pt stroke icon, as in the design.
function Icon({ stroke = color.text, children }: { stroke?: string; children: React.ReactNode }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

const RADIUS = theme.size.roundButton / 2;

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
  },
  flat: { backgroundColor: 'rgba(28,28,30,0.94)' },
  blur: { ...StyleSheet.absoluteFill, borderRadius: RADIUS, overflow: 'hidden' },
  round: { width: theme.size.roundButton, height: theme.size.roundButton },
  roundButton: {
    width: theme.size.roundButton,
    height: theme.size.roundButton,
    borderRadius: RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: { flexDirection: 'row', height: theme.size.roundButton },
  pillButton: { width: 50, height: theme.size.roundButton, alignItems: 'center', justifyContent: 'center' },
});
