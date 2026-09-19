import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RouteView } from '@/contract';
import { theme } from '@/theme';
import { formatTime } from '@/time';

const { color, type } = theme;

const deltaColor: Record<RouteView['deltaKind'], string> = {
  early: color.onTime,
  tight: color.atRisk,
  late: color.late,
};

function deltaText(deltaMin: number): string {
  if (deltaMin === 0) return 'right on time';
  return deltaMin < 0 ? `${-deltaMin} min early` : `${deltaMin} min late`;
}

type Props = {
  routes: RouteView[];
  caption: string; // the departure the list is computed for: "leaving now, 7:45"
  onSelect?: (routeId: string) => void;
};

export function RouteList({ routes, caption, onSelect }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Routes</Text>
        <Text style={styles.leaving}>{caption}</Text>
      </View>
      {routes.map((r, i) => (
        <View key={r.id}>
          {i > 0 && <View style={styles.divider} />}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: r.selected }}
            onPress={() => onSelect?.(r.id)}
            style={styles.row}
          >
            {r.selected ? (
              <View style={[styles.radio, styles.radioOn]}>
                <View style={styles.check} />
              </View>
            ) : (
              <View style={[styles.radio, styles.radioOff]} />
            )}
            <View style={styles.body}>
              <View style={styles.nameLine}>
                <Text style={styles.name} numberOfLines={1}>
                  {r.label}
                </Text>
                {r.recommended && <Text style={styles.best}>Best</Text>}
              </View>
              <Text style={styles.meta}>
                {r.durationMin} min
                {r.trafficDelayMin > 0 ? ` · ${r.trafficDelayMin} min traffic delay` : ''}
              </Text>
            </View>
            <View style={styles.end}>
              <Text style={styles.arrive}>{formatTime(r.arriveAt)}</Text>
              <Text style={[styles.delta, { color: deltaColor[r.deltaKind] }]}>{deltaText(r.deltaMin)}</Text>
            </View>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.space.screen,
    borderRadius: theme.radius.card,
    backgroundColor: color.surface,
    paddingVertical: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: theme.space.cardPad,
  },
  title: { ...type.cardTitle, color: color.text },
  leaving: { ...type.meta, color: color.textMuted },
  divider: { height: 1, marginLeft: 50, backgroundColor: color.hairline },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: theme.size.routeRow,
    paddingVertical: 8,
    paddingHorizontal: theme.space.cardPad,
  },
  radio: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: color.accent },
  radioOff: { borderWidth: 2, borderColor: color.radioIdle },
  // A tick drawn from two borders of a rotated box.
  check: {
    width: 6,
    height: 11,
    marginTop: -2,
    borderRightWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: color.onAccent,
    transform: [{ rotate: '45deg' }],
  },
  body: { flex: 1, gap: 2 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { ...type.rowTitle, color: color.text, flexShrink: 1 },
  best: {
    ...type.tag,
    color: color.onAccentTint,
    backgroundColor: color.accentTint,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 9,
    overflow: 'hidden',
  },
  meta: { ...type.meta, color: color.textMuted },
  end: { alignItems: 'flex-end', gap: 2 },
  arrive: { ...type.rowTime, color: color.text },
  delta: type.metaStrong,
});
