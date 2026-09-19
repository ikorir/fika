import { Pressable, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Evaluation } from '@/contract';
import { theme } from '@/theme';
import { betterRoute, routeName } from '@/today/words';

const { color } = theme;

type Props = { evaluation?: Evaluation; onSelectRoute: (routeId: string) => void };

// The state's one primary action. At risk: "Switch to <route>" when another route restores on time.
// "Remind me at 7:55" (on time, #11) and "Review and send notice" (late, #6) are not built yet.
export function PrimaryAction({ evaluation, onSelectRoute }: Props) {
  const target = evaluation?.state === 'at_risk' ? betterRoute(evaluation) : null;
  if (!target) return null;
  return (
    <Pressable accessibilityRole="button" onPress={() => onSelectRoute(target.id)} style={styles.button}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color.onAccent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 8h13l-3-3M20 16H7l3 3" />
      </Svg>
      <Text style={styles.label} numberOfLines={1}>
        Switch to {routeName(target)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: theme.size.button,
    paddingHorizontal: 20,
    borderRadius: theme.radius.pill,
    backgroundColor: color.accent,
  },
  label: { ...theme.type.button, color: color.onAccent, flexShrink: 1 },
});
