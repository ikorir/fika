import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { evaluate } from '@/engine';
import { theme } from '@/theme';
import { ActionArea } from '@/today/ActionArea';
import { Hero } from '@/today/Hero';
import { MapArea } from '@/today/MapArea';
import { RouteList } from '@/today/RouteList';
import { useNow } from '@/today/useNow';
import { useRoutes } from '@/today/useRoutes';
import { leavingNow } from '@/today/words';
import { useCommute } from '@/useCommute';

const { color, type } = theme;

export default function TodayScreen() {
  const commute = useCommute();
  const { data, error, loading, refresh } = useRoutes(commute);
  const [selectedId, setSelectedId] = useState<string>();
  const now = useNow(data);

  // The screen renders the engine's Evaluation and makes no commute decisions of its own.
  const hasRoute = data?.samples.some((s) => s.routes.length > 0) ?? false;
  const evaluation =
    data && hasRoute ? evaluate({ commute, samples: data.samples, now, selectedRouteId: selectedId }) : undefined;
  const routes = evaluation?.routes ?? [];

  return (
    <View style={styles.screen}>
      <MapArea routes={routes} onSelectRoute={setSelectedId} onRefresh={refresh} />
      <ScrollView contentContainerStyle={styles.content}>
        <Hero commute={commute} evaluation={evaluation} />

        {evaluation && (
          <RouteList
            routes={routes}
            departAt={evaluation.departAt}
            leavingNow={leavingNow(evaluation)}
            onSelect={setSelectedId}
          />
        )}
        {data && !hasRoute && <Text style={styles.message}>No driving route found for this commute.</Text>}

        {loading && !data && <ActivityIndicator color={color.accent} style={styles.spinner} />}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.message}>Couldn’t get routes. {error}</Text>
            <Pressable accessibilityRole="button" onPress={refresh} disabled={loading} style={styles.retry}>
              <Text style={styles.retryLabel}>{loading ? 'Trying…' : 'Try again'}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <ActionArea updatedAt={data?.fetchedAt} evaluation={evaluation} onSelectRoute={setSelectedId} />
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
