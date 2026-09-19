import { StyleSheet, Text, View } from 'react-native';

import type { Commute } from '@/contract';
import { theme } from '@/theme';
import { formatClock } from '@/time';

// Status pill, commute summary, leave-by / ETA, decision line and conditions note.
// Only the summary for now; the rest arrives with the commute engine (#4) and Claude's words (#7).
export function Hero({ commute }: { commute: Commute }) {
  return (
    <View style={styles.hero}>
      <Text style={styles.summary}>
        {commute.origin.label} to {commute.destination.label} · arrive by {formatClock(commute.arriveBy)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: theme.space.heroInset, gap: 8 },
  summary: { ...theme.type.note, color: theme.color.textMuted },
});
