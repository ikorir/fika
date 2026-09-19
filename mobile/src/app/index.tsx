import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DemoSheet } from '@/demo/DemoSheet';
import { useDemo } from '@/demo/useDemo';
import { useDraft } from '@/draft/useDraft';
import { evaluate } from '@/engine';
import { NoticeCard } from '@/notice/NoticeCard';
import { NoticeSheet } from '@/notice/NoticeSheet';
import { useNotice } from '@/notice/useNotice';
import { theme } from '@/theme';
import { ActionArea } from '@/today/ActionArea';
import { Hero } from '@/today/Hero';
import { MapArea } from '@/today/MapArea';
import { RouteList } from '@/today/RouteList';
import { SimulationBanner } from '@/today/SimulationBanner';
import { useNow } from '@/today/useNow';
import { useRoutes } from '@/today/useRoutes';
import { departureCaption } from '@/today/words';
import { useCommute } from '@/useCommute';

const { color, type } = theme;

export default function TodayScreen() {
  const commute = useCommute();
  const { data, error, loading, refresh } = useRoutes(commute);
  const [selectedId, setSelectedId] = useState<string>();
  const now = useNow(data);
  const demo = useDemo();
  const [demoOpen, setDemoOpen] = useState(false);

  // The screen renders the engine's Evaluation and makes no commute decisions of its own.
  const hasRoute = data?.samples.some((s) => s.routes.length > 0) ?? false;
  const evaluation =
    data && hasRoute
      ? evaluate({ commute, samples: data.samples, now, selectedRouteId: selectedId, simulation: demo.simulation })
      : undefined;
  const routes = evaluation?.routes ?? [];
  // Claude writes the decision line, the conditions note and the notice from the facts the engine just computed.
  const draft = useDraft(commute, evaluation, demo.simulation);
  const notice = useNotice(evaluation, commute.contact, draft.words?.notice);

  // Keep the route on screen selected when the numbers change, so a slower route turns the screen at risk and
  // offers "Switch to …" instead of the selection quietly following the best route.
  const shownId = routes.find((r) => r.selected)?.id;
  useEffect(() => {
    if (selectedId === undefined && shownId) setSelectedId(shownId);
  }, [selectedId, shownId]);

  const noticeCard = notice.notice && (
    <NoticeCard
      notice={notice.notice}
      contact={commute.contact}
      loading={draft.loading && !notice.mine}
      onPress={notice.show}
    />
  );

  return (
    <View style={styles.screen}>
      <MapArea
        routes={routes}
        onSelectRoute={setSelectedId}
        onRefresh={refresh}
        onDemo={() => setDemoOpen(true)}
        demoOn={demo.on}
      />
      <SimulationBanner evaluation={evaluation} />
      <ScrollView contentContainerStyle={styles.content}>
        <Hero commute={commute} evaluation={evaluation} draft={draft} />

        {/* Late, the notice takes the routes' place. The routes stay above it only while switching gets back on time. */}
        {evaluation && (!noticeCard || evaluation.betterRouteId) && (
          <RouteList
            routes={routes}
            caption={departureCaption(evaluation)}
            onSelect={setSelectedId}
          />
        )}
        {noticeCard}
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
      <ActionArea
        updatedAt={data?.fetchedAt}
        evaluation={evaluation}
        onSelectRoute={setSelectedId}
        onReviewNotice={notice.show}
      />
      <NoticeSheet
        visible={notice.open}
        notice={notice.notice}
        contact={commute.contact}
        onEdit={notice.edit}
        onClose={notice.hide}
      />
      <DemoSheet
        visible={demoOpen}
        onClose={() => setDemoOpen(false)}
        demo={demo}
        commute={commute}
        samples={data?.samples ?? []}
        evaluation={evaluation}
        onRestart={() => setSelectedId(undefined)}
      />
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
