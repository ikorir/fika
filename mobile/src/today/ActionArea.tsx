import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Commute, Evaluation } from '@/contract';
import { theme } from '@/theme';
import { formatTime } from '@/time';
import { directionsUrl } from '@/today/directions';
import { decodePath, pointAlong } from '@/today/path';
import { PrimaryAction } from '@/today/PrimaryAction';

// The primary action, then "Updated h:mm" and "Open in Google Maps".
type Props = {
  commute: Commute;
  updatedAt?: string;
  evaluation?: Evaluation;
  onSelectRoute: (routeId: string) => void;
  onReviewNotice: () => void;
};

export function ActionArea({ commute, updatedAt, evaluation, onSelectRoute, onReviewNotice }: Props) {
  const insets = useSafeAreaInsets();
  const selected = evaluation?.routes.find((r) => r.selected);
  const url = useMemo(() => {
    const path = selected ? decodePath(selected.polyline) : [];
    const via = path.length > 1 ? pointAlong(path, 0.5) : undefined;
    return directionsUrl(commute.origin.location, commute.destination.location, via);
  }, [commute.origin.location, commute.destination.location, selected?.polyline]);

  return (
    <View style={[styles.area, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <PrimaryAction evaluation={evaluation} onSelectRoute={onSelectRoute} onReviewNotice={onReviewNotice} />
      <View style={styles.footer}>
        {updatedAt ? <Text style={styles.updated}>Updated {formatTime(updatedAt)}</Text> : <View />}
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
  link: { ...theme.type.metaStrong, fontSize: 14, color: theme.color.accent },
});
