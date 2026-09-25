import { useMemo } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Commute, Evaluation } from '@/contract';
import type { Reminder } from '@/reminders/useReminders';
import { theme } from '@/theme';
import { directionsUrl } from '@/today/directions';
import { updatedLabel } from '@/today/freshness';
import { decodePath, pointAlong } from '@/today/path';
import { PrimaryAction } from '@/today/PrimaryAction';
import { Press } from '@/ui/Press';
import { LARGE_TEXT_CAP } from '@/ui/useFontScale';

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
  // The real clock, not Demo mode's: how old the numbers are is about when they were fetched. The screen's clock
  // ticks every 30 seconds, so the label ages while the app sits open without anything being fetched.
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
        {updated ? (
          <View style={styles.freshness}>
            {/* Green while the numbers are fresh, amber once they are stale. */}
            <View testID="freshness-dot" style={[styles.dot, updated.stale && styles.staleDot]} />
            <Text style={[styles.updated, updated.stale && styles.stale]} maxFontSizeMultiplier={LARGE_TEXT_CAP}>
              {updated.text}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <Press accessibilityRole="link" onPress={() => openDirections(url)} hitSlop={10} style={styles.linkPress}>
          <Text style={styles.link} maxFontSizeMultiplier={LARGE_TEXT_CAP}>
            Open in Google Maps
          </Text>
        </Press>
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
  // Side by side while both fit; at large text sizes the link wraps onto its own line, still on the right.
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 12,
    rowGap: 6,
    paddingHorizontal: 6,
    minHeight: 24,
  },
  freshness: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.color.onTime },
  staleDot: { backgroundColor: theme.color.atRisk },
  updated: { ...theme.type.meta, color: theme.color.textMuted, flexShrink: 1 },
  stale: { color: theme.color.atRisk },
  linkPress: { marginLeft: 'auto', flexShrink: 1 },
  link: { ...theme.type.metaStrong, fontSize: 14, color: theme.color.accent, textAlign: 'right' },
});
