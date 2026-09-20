// The rows the setup screen is built from, and the stroke icons beside them. Design: design/screens/Setup.dc.html.
import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { theme } from '@/theme';

const { color, type } = theme;

export type IconName = 'from' | 'to' | 'flag' | 'clock' | 'shield' | 'extra' | 'person' | 'phone' | 'badge';

const paths: Record<Exclude<IconName, 'from'>, ReactNode> = {
  to: (
    <>
      <Path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z" />
      <Circle cx={12} cy={10} r={2.5} />
    </>
  ),
  flag: <Path d="M6 21V4M6 5h11l-2 4 2 4H6" />,
  clock: (
    <>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 7.5V12l3 2" />
    </>
  ),
  shield: <Path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" />,
  extra: (
    <>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 8v8M8 12h8" />
    </>
  ),
  person: (
    <>
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  phone: <Path d="M6 3h4l1.5 5-2.5 1.5a12 12 0 0 0 5.5 5.5L16 12.5l5 1.5v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z" />,
  badge: (
    <>
      <Rect x={3.5} y={7.5} width={17} height={12} rx={2} />
      <Path d="M9 7.5V5.5h6v2" />
    </>
  ),
};

/** A 22 pt stroke icon, or the white ring that marks where the commute starts. */
export function RowIcon({ name }: { name: IconName }) {
  if (name === 'from')
    return (
      <View style={styles.iconBox}>
        <View style={styles.ring} />
      </View>
    );
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke={name === 'to' ? color.accent : color.textMuted}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </Svg>
  );
}

/** The up-and-down chevrons that say a row's value can be changed. */
function Steps() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m8 9 4-4 4 4M8 15l4 4 4-4" />
    </Svg>
  );
}

/** A group of rows on one rounded surface, hairlines between them. */
export function Card({ children }: { children: ReactNode }) {
  return (
    <View style={styles.card}>
      {Children.toArray(children).map((row, i) => (
        <View key={i}>
          {i > 0 && <View style={styles.divider} />}
          {row}
        </View>
      ))}
    </View>
  );
}

function Shell({
  problem,
  onPress,
  accessibilityLabel,
  children,
}: {
  problem?: string;
  onPress?: () => void;
  accessibilityLabel: string;
  children: ReactNode;
}) {
  const inside = (
    <>
      {children}
      {problem ? <Text style={styles.problem}>{problem}</Text> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{inside}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={styles.row}>
      {inside}
    </Pressable>
  );
}

/** Where the commute starts and ends: the label above, the chosen address below. */
export function AddressRow({
  icon,
  label,
  value,
  problem,
  onPress,
}: {
  icon: 'from' | 'to';
  label: string;
  value: string;
  problem?: string;
  onPress: () => void;
}) {
  return (
    <Shell problem={problem} onPress={onPress} accessibilityLabel={`${label}: ${value || 'not set'}`}>
      <View style={[styles.line, styles.lineTall]}>
        <RowIcon name={icon} />
        <View style={styles.stack}>
          <Text style={styles.caption}>{label}</Text>
          <Text style={styles.address} numberOfLines={1}>
            {value || 'Search an address'}
          </Text>
        </View>
      </View>
    </Shell>
  );
}

/** A setting with a few sensible values: tapping it opens the sheet that picks one. */
export function PickRow({
  icon,
  label,
  value,
  problem,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string;
  problem?: string;
  onPress: () => void;
}) {
  return (
    <Shell problem={problem} onPress={onPress} accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.line}>
        <RowIcon name={icon} />
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
        <Steps />
      </View>
    </Shell>
  );
}

/** A setting the commuter types: the contact's name and number. */
export function InputRow({
  icon,
  label,
  problem,
  ...input
}: { icon: IconName; label: string; problem?: string } & TextInputProps) {
  return (
    <Shell problem={problem} accessibilityLabel={label}>
      <View style={styles.line}>
        <RowIcon name={icon} />
        <Text style={styles.label}>{label}</Text>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={color.radioIdle}
          selectionColor={color.accent}
          style={styles.input}
          {...input}
        />
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: theme.radius.card, backgroundColor: color.surface },
  divider: { height: 1, marginLeft: 52, backgroundColor: color.hairline },
  row: { paddingHorizontal: 16 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: theme.size.row },
  lineTall: { minHeight: 60, paddingVertical: 8 },
  iconBox: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: color.text },
  stack: { flex: 1, gap: 1 },
  caption: { ...type.meta, color: color.textMuted },
  address: { ...type.rowTitle, color: color.text },
  label: { ...type.body, color: color.text, flex: 1 },
  value: { ...type.body, color: color.textMuted },
  input: { ...type.body, color: color.textMuted, flex: 1, textAlign: 'right', paddingVertical: 8 },
  problem: { ...type.meta, color: color.late, paddingLeft: 36, paddingBottom: 10, marginTop: -4 },
});
