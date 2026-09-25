// The sheet behind "Different time on some days": the week, Monday to Sunday, each day on the usual arrive-by until
// it is given its own. Tapping a day opens its time; the cross puts it back on the usual one.
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Commute, Weekday } from '@/contract';
import { theme } from '@/theme';
import { formatClock } from '@/time';
import { Press } from '@/ui/Press';
import { Sheet } from '@/ui/Sheet';

const { color, type } = theme;

export const DAYS_TITLE = 'Different time on some days';

/** The week as setup lists it. */
export const WEEK: { day: Weekday; name: string; short: string }[] = [
  { day: 'mon', name: 'Monday', short: 'Mon' },
  { day: 'tue', name: 'Tuesday', short: 'Tue' },
  { day: 'wed', name: 'Wednesday', short: 'Wed' },
  { day: 'thu', name: 'Thursday', short: 'Thu' },
  { day: 'fri', name: 'Friday', short: 'Fri' },
  { day: 'sat', name: 'Saturday', short: 'Sat' },
  { day: 'sun', name: 'Sunday', short: 'Sun' },
];

/** The row's value: "None", the one day ("Fri 8:30"), or how many days have their own time ("2 days"). */
export function daysSummary(days: Commute['arriveByByDay']): string {
  const own = WEEK.filter(({ day }) => days?.[day]);
  if (own.length === 0) return 'None';
  if (own.length === 1) return `${own[0].short} ${formatClock(days![own[0].day]!)}`;
  return `${own.length} days`;
}

type Props = {
  visible: boolean;
  arriveBy: string; // the usual arrive-by, "HH:mm"
  days: Commute['arriveByByDay'];
  onPick: (day: Weekday) => void;
  onClear: (day: Weekday) => void;
  onClose: () => void;
};

export function DaysSheet({ visible, arriveBy, days, onPick, onClear, onClose }: Props) {
  const usual = formatClock(arriveBy);
  return (
    <Sheet visible={visible} title={DAYS_TITLE} onClose={onClose}>
      <Text style={styles.note}>A blank day uses your usual {usual}.</Text>
      <View style={styles.card}>
        {WEEK.map(({ day, name }, i) => {
          const own = days?.[day];
          return (
            <View key={day}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.row}>
                <Press
                  accessibilityRole="button"
                  accessibilityLabel={`${name}: ${own ? formatClock(own) : `usual time, ${usual}`}`}
                  onPress={() => onPick(day)}
                  style={styles.pick}
                >
                  <Text style={styles.label}>{name}</Text>
                  <Text style={[styles.value, own ? styles.valueOwn : null]}>{own ? formatClock(own) : 'Usual'}</Text>
                </Press>
                {own ? (
                  <Press
                    accessibilityRole="button"
                    accessibilityLabel={`Use the usual time on ${name}`}
                    onPress={() => onClear(day)}
                    style={styles.clear}
                  >
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color.textMuted} strokeWidth={2.2} strokeLinecap="round">
                      <Path d="M6 6l12 12M18 6 6 18" />
                    </Svg>
                  </Press>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  note: { ...type.note, color: color.textMuted, paddingHorizontal: 4 },
  card: { borderRadius: theme.radius.card, backgroundColor: color.surfaceRaised },
  divider: { height: 1, marginLeft: 16, backgroundColor: color.hairline },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 6 },
  pick: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: theme.size.row, paddingHorizontal: 16 },
  label: { ...type.body, color: color.text, flex: 1 },
  value: { ...type.body, color: color.textMuted },
  valueOwn: { color: color.text },
  clear: {
    width: theme.size.roundButton,
    height: theme.size.roundButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
