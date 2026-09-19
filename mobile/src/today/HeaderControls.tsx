import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { theme } from '@/theme';

const { color } = theme;

// Round buttons floating over the map: edit commute (left); Demo mode and refresh (right).
// The Demo mode icon turns accent orange while Demo mode is on.
type Props = { onRefresh: () => void; onDemo?: () => void; demoOn?: boolean };

export function HeaderControls({ onRefresh, onDemo, demoOn = false }: Props) {
  return (
    <View style={styles.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit commute" onPress={() => router.push('/setup')} style={[styles.round, styles.chrome]}>
        <Icon>
          <Path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
          <Circle cx={16} cy={7} r={2} />
          <Circle cx={8} cy={17} r={2} />
        </Icon>
      </Pressable>
      <View style={[styles.pill, styles.chrome]}>
        {onDemo && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={demoOn ? 'Demo mode, on' : 'Demo mode'}
            onPress={onDemo}
            style={styles.pillButton}
          >
            <Icon stroke={demoOn ? color.accent : color.text}>
              <Path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9" />
            </Icon>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh routes" onPress={onRefresh} style={styles.pillButton}>
          <Icon>
            <Path d="M20 11a8 8 0 0 0-14.9-3M4 5v3.5h3.5M4 13a8 8 0 0 0 14.9 3M20 19v-3.5h-3.5" />
          </Icon>
        </Pressable>
      </View>
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

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chrome: { borderWidth: 1, borderColor: color.border, backgroundColor: 'rgba(28,28,30,0.94)' },
  round: {
    width: theme.size.roundButton,
    height: theme.size.roundButton,
    borderRadius: theme.size.roundButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: { flexDirection: 'row', height: theme.size.roundButton, borderRadius: theme.size.roundButton / 2 },
  pillButton: { width: 50, height: '100%', alignItems: 'center', justifyContent: 'center' },
});
