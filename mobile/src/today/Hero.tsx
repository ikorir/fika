import { StyleSheet, Text, View } from 'react-native';

import type { Commute } from '@/contract';
import { theme } from '@/theme';
import { formatTime, nairobiTimeOnDay } from '@/time';

// Status pill, commute summary, leave-by / ETA, decision line and conditions note.
// Only the summary for now; the rest arrives with the commute engine (#4) and Claude's words (#7).
export function Hero({ commute }: { commute: Commute }) {
  const deadline = formatTime(nairobiTimeOnDay(commute.arriveBy, new Date()));
  return (
    <View style={styles.hero}>
      <Text style={styles.summary}>
        {commute.origin.label} to {commute.destination.label} · arrive by {deadline}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: theme.space.heroInset, gap: 8 },
  summary: { ...theme.type.note, color: theme.color.textMuted },
});
