import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Commute, Evaluation } from '@/contract';
import type { Reminder } from '@/reminders/useReminders';
import { theme } from '@/theme';
import { directionsUrl } from '@/today/directions';
import { updatedLabel } from '@/today/freshness';
import { decodePath, pointAlong } from '@/today/path';
import { PrimaryAction } from '@/today/PrimaryAction';

// The primary action, then how old the numbers are and "Open in Google Maps".
type Props = {
  commute: Commute;
  updatedAt?: string;
  now: Date;
  evaluation?: Evaluation;
  reminder: Reminder;
  onSelectRoute: (routeId: string) => void;
  onReviewNotice: () => void;
};

export function ActionArea({ commute, updatedAt, now, evaluation, reminder, onSelectRoute, onReviewNotice }: Props) {
  const insets = useSafeAreaInsets();
  // The real clock, not Demo mode's: how old the numbers are is about when they were fetched.
  const updated = updatedAt ? updatedLabel(updatedAt, now) : null;
  const selected = evaluation?.routes.find((r) => r.selected);
  const url = useMemo(() => {
    const path = selected ? decodePath(selected.polyline) : [];
    return directionsUrl(commute.origin.location, commute.destination.location, pointAlong(path, 0.5));
  }, [commute.origin.location, commute.destination.location, selected?.polyline]);

  return (
    <View style={[styles.area, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <PrimaryAction
        evaluation={evaluation}
        reminder={reminder}
        onSelectRoute={onSelectRoute}
        onReviewNotice={onReviewNotice}
      />
      <View style={styles.footer}>
        {updated ? <Text style={[styles.updated, updated.stale && styles.stale]}>{updated.text}</Text> : <View />}
        <Pressable accessibilityRole="link" onPress={() => openDirections(url)} hitSlop={10}>
          <Text style={styles.link}>Open in Google Maps</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Nothing to fall back to: Google Maps is either installed or opens in the browser.
async function openDirections(url: string) {
  try {
    await Linking.openURL(url);
  } catch (e) {
    console.warn('Could not open Google Maps', e);
  }
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
  stale: { color: theme.color.atRisk },
  link: { ...theme.type.metaStrong, fontSize: 14, color: theme.color.accent },
});
