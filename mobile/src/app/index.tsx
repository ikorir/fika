import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DemoSheet } from '@/demo/DemoSheet';
import { savedCommute, savedRoutes } from '@/demo/saved';
import { useDemo } from '@/demo/useDemo';
import { useDraft } from '@/draft/useDraft';
import { evaluate } from '@/engine';
import { NoticeCard } from '@/notice/NoticeCard';
import { NoticeSheet } from '@/notice/NoticeSheet';
import { useNotice } from '@/notice/useNotice';
import { useVoice } from '@/notice/voice';
import { useDailyReminder, useDemoReminderCue, useOneOffReminder, useRefreshOnWake } from '@/reminders/useReminders';
import { theme } from '@/theme';
import { ActionArea } from '@/today/ActionArea';
import { Hero } from '@/today/Hero';
import { MapArea } from '@/today/MapArea';
import { RouteList } from '@/today/RouteList';
import { SimulationBanner } from '@/today/SimulationBanner';
import { useNow } from '@/today/useNow';
import { useRoutes } from '@/today/useRoutes';
import { departureCaption, reminderBody } from '@/today/words';
import { useStateHaptic } from '@/ui/haptics';
import { Press } from '@/ui/Press';
import { useCommute } from '@/useCommute';

const { color, type } = theme;

export default function TodayScreen() {
  const { commute: own } = useCommute();
  const demo = useDemo();
  // Saved routes come with the commute they were fetched for. The commuter's own stays on the phone, untouched,
  // and is still the one routes are fetched and the daily reminder is set for.
  const commute = demo.saved ? savedCommute : own;
  const { data, error, loading, refresh } = useRoutes(own, demo.saved);
  const [selectedId, setSelectedId] = useState<string>();
  const now = useNow(data);
  const [demoOpen, setDemoOpen] = useState(false);

  // The screen renders the engine's Evaluation and makes no commute decisions of its own.
  const hasRoute = data?.samples.some((s) => s.routes.length > 0) ?? false;
  const evaluation =
    data && hasRoute
      ? evaluate({ commute, samples: data.samples, now, selectedRouteId: selectedId, simulation: demo.simulation })
      : undefined;
  const routes = evaluation?.routes ?? [];
  // A buzz when the state changes, simulated changes included; Demo mode's clock steps themselves stay silent.
  useStateHaptic(evaluation?.state);

  // Onto the saved routes, Demo mode starts again from their numbers. Off them, Demo mode goes off too and the
  // screen is live: the live numbers may not be in yet, and a demo clock set for one day's routes is wrong on another's.
  const onSavedRoutes = (on: boolean) => {
    if (on) demo.runOnSaved(evaluate({ commute: savedCommute, samples: savedRoutes.samples, now }));
    else demo.turnOff();
    setSelectedId(undefined);
  };

  // Reminders: the daily one the commuter never has to think about, and the one-off one behind "Remind me at 7:55".
  // Fresh numbers whenever the app comes forward or a reminder is tapped; no polling in between.
  const body = evaluation ? reminderBody(evaluation) : '';
  useDailyReminder(own.usualDeparture);
  useRefreshOnWake(refresh);
  const reminder = useOneOffReminder(evaluation?.remindAt ?? null, body);
  useDemoReminderCue(evaluation, demo.on, body);

  // Claude writes the decision line, the conditions note and the notice from the facts the engine just computed.
  // The screen's own words stay in English; the notice is written in the voice the commuter picked in its sheet,
  // which is one more call only while that voice differs from the contact's own.
  const { voice, setTone, setLanguage } = useVoice(commute.contact);
  const draft = useDraft(commute, evaluation, demo.simulation, undefined, demo.saved, data?.rain);
  const noticeDraft = useDraft(commute, evaluation, demo.simulation, voice, demo.saved, data?.rain);
  const notice = useNotice(evaluation, commute.contact, noticeDraft.words?.notice, voice);

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
      loading={noticeDraft.loading && !notice.mine}
      onPress={notice.show}
    />
  );

  return (
    <View style={styles.screen}>
      <MapArea
        commute={commute}
        routes={routes}
        state={evaluation?.state}
        incidentRouteId={demo.simulation?.delay?.routeId}
        onSelectRoute={setSelectedId}
        onRefresh={refresh}
        onDemo={() => setDemoOpen(true)}
        demoOn={demo.on}
      />
      <SimulationBanner evaluation={evaluation} saved={demo.saved} />
      <ScrollView contentContainerStyle={styles.content}>
        <Hero commute={commute} evaluation={evaluation} draft={draft} rain={data?.rain} />

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

        {/* A failed fetch keeps the last numbers on screen above this, and says so. */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.message}>
              {data ? 'Couldn’t refresh — these are the numbers Fika last got. ' : 'Couldn’t get routes. '}
              {error}
            </Text>
            <Press accessibilityRole="button" onPress={refresh} disabled={loading} style={styles.retry}>
              <Text style={styles.retryLabel}>{loading ? 'Trying…' : 'Try again'}</Text>
            </Press>
          </View>
        )}
      </ScrollView>
      <ActionArea
        commute={commute}
        updatedAt={data?.fetchedAt}
        now={now}
        evaluation={evaluation}
        reminder={reminder}
        onSelectRoute={setSelectedId}
        onReviewNotice={notice.show}
      />
      <NoticeSheet
        visible={notice.open}
        notice={notice.notice}
        contact={commute.contact}
        voice={voice}
        onTone={setTone}
        onLanguage={setLanguage}
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
        onSaved={onSavedRoutes}
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
