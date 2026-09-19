import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Evaluation } from '@/contract';
import { theme } from '@/theme';
import { formatTime } from '@/time';
import { PrimaryAction } from '@/today/PrimaryAction';

// The primary action, then "Updated h:mm" and "Open in Google Maps" (#9).
type Props = { updatedAt?: string; evaluation?: Evaluation; onSelectRoute: (routeId: string) => void };

export function ActionArea({ updatedAt, evaluation, onSelectRoute }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.area, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <PrimaryAction evaluation={evaluation} onSelectRoute={onSelectRoute} />
      <View style={styles.footer}>
        {updatedAt && <Text style={styles.updated}>Updated {formatTime(updatedAt)}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { paddingHorizontal: theme.space.screen, paddingTop: 10, gap: 10 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    minHeight: 24,
  },
  updated: { ...theme.type.meta, color: theme.color.textMuted },
});
