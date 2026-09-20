// The sheet behind the two times: hours one at a time, minutes five at a time, as the Demo mode clock steps.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Sheet } from '@/setup/Sheet';
import { theme } from '@/theme';
import { formatClock } from '@/time';

const { color, type } = theme;

const MINUTE_STEP = 5;
const pad = (n: number) => String(n).padStart(2, '0');

/** A stored "HH:mm" moved by whole hours or by minutes, each wrapping round on its own. */
function shift(hhmm: string, hours: number, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  return `${pad((h + hours + 24) % 24)}:${pad((m + minutes + 60) % 60)}`;
}

type Props = { visible: boolean; title: string; value: string; onChange: (value: string) => void; onClose: () => void };

export function TimeSheet({ visible, title, value, onChange, onClose }: Props) {
  const [hour, minute] = value.split(':');
  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <Text style={styles.time} accessibilityLabel={`${title} ${formatClock(value)}`}>
        {formatClock(value)}
      </Text>
      <View style={styles.card}>
        <Stepper label="Hour" value={hour} onStep={(by) => onChange(shift(value, by, 0))} />
        <View style={styles.divider} />
        <Stepper label="Minute" value={minute} onStep={(by) => onChange(shift(value, 0, by * MINUTE_STEP))} />
      </View>
    </Sheet>
  );
}

function Stepper({ label, value, onStep }: { label: string; value: string; onStep: (by: number) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Step label={`${label} back`} onPress={() => onStep(-1)} path="M6 12h12" />
      <Text style={styles.value}>{value}</Text>
      <Step label={`${label} forward`} onPress={() => onStep(1)} path="M6 12h12M12 6v12" />
    </View>
  );
}

function Step({ label, onPress, path }: { label: string; onPress: () => void; path: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.step}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color.text} strokeWidth={2.2} strokeLinecap="round">
        <Path d={path} />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  time: { ...type.title, color: color.text, textAlign: 'center', paddingVertical: 4 },
  card: { borderRadius: theme.radius.card, backgroundColor: color.surfaceRaised },
  divider: { height: 1, marginLeft: 16, backgroundColor: color.hairline },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingLeft: 16, paddingRight: 10 },
  label: { ...type.body, color: color.text, flex: 1 },
  value: { ...type.clock, color: color.text, width: 40, textAlign: 'center' },
  step: {
    width: theme.size.roundButton,
    height: theme.size.roundButton,
    borderRadius: theme.size.roundButton / 2,
    backgroundColor: color.controlRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
