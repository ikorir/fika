import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/theme';
import { formatTime } from '@/time';

// The state's one primary action, then "Updated h:mm" and "Open in Google Maps".
// Only the freshness line for now; the actions arrive with #4, #6, #9 and #11.
export function ActionArea({ updatedAt }: { updatedAt?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.area, { paddingBottom: Math.max(insets.bottom, 16) }]}>
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
