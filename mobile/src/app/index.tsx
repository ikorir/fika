import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchRoutes } from '@/api';
import type { RoutesResponse } from '@/contract';
import { seedCommute } from '@/seed';
import { theme } from '@/theme';
import { nairobiTimeOnDay } from '@/time';
import { ActionArea } from '@/today/ActionArea';
import { Hero } from '@/today/Hero';
import { MapArea } from '@/today/MapArea';
import { RouteList } from '@/today/RouteList';
import { skeletonRouteViews } from '@/today/skeleton-routes';

const { color, type } = theme;
const commute = seedCommute;

export default function TodayScreen() {
  const [data, setData] = useState<RoutesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      setData(
        await fetchRoutes({
          origin: commute.origin.location,
          destination: commute.destination.location,
          arriveBy: nairobiTimeOnDay(commute.arriveBy, now),
          usualDeparture: nairobiTimeOnDay(commute.usualDeparture, now),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sample = data?.samples.find((s) => s.kind === 'now') ?? data?.samples[0];
  const routes = sample ? skeletonRouteViews(sample, commute, selectedId) : [];

  return (
    <View style={styles.screen}>
      <MapArea />
      <ScrollView contentContainerStyle={styles.content}>
        <Hero commute={commute} />

        {sample && routes.length > 0 && (
          <RouteList routes={routes} departAt={sample.departAt} onSelect={setSelectedId} />
        )}
        {sample && routes.length === 0 && <Text style={styles.message}>No driving route found for this commute.</Text>}

        {loading && !data && <ActivityIndicator color={color.accent} style={styles.spinner} />}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.message}>Couldn’t get routes. {error}</Text>
            <Pressable accessibilityRole="button" onPress={load} disabled={loading} style={styles.retry}>
              <Text style={styles.retryLabel}>{loading ? 'Trying…' : 'Try again'}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <ActionArea updatedAt={data?.fetchedAt} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { paddingTop: 2, paddingBottom: 16, gap: theme.space.gap },
  spinner: { marginTop: 40 },
  message: { ...type.note, color: color.textMuted, paddingHorizontal: theme.space.heroInset },
  errorBox: { gap: 12 },
  retry: {
    marginHorizontal: theme.space.screen,
    height: theme.size.buttonSecondary,
    borderRadius: theme.radius.pill,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryLabel: { ...type.button, color: color.text },
});
