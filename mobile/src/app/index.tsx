import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { DemoSheet } from '@/demo/DemoSheet';
import { savedCommute, savedRoutes } from '@/demo/saved';
import { useDemo } from '@/demo/useDemo';
import { useDraft } from '@/draft/useDraft';
import { evaluate } from '@/engine';
import { commuteDayAt, effectiveCommute } from '@/engine/effective';
import { explain } from '@/engine/explain';
import { isPublicHoliday } from '@/engine/holidays';
import { departureWindow } from '@/engine/window';
import { NoticeCard } from '@/notice/NoticeCard';
import { NoticeSheet } from '@/notice/NoticeSheet';
import { useNotice } from '@/notice/useNotice';
import { useVoice } from '@/notice/voice';
import { useDailyReminder, useDemoReminderCue, useOneOffReminder, useRefreshOnWake } from '@/reminders/useReminders';
import { theme } from '@/theme';
import { ActionArea } from '@/today/ActionArea';
import { DepartureWindow } from '@/today/DepartureWindow';
import { Hero } from '@/today/Hero';
import { MapArea } from '@/today/MapArea';
import { RouteList, RouteListSkeleton } from '@/today/RouteList';
import { SimulationBanner } from '@/today/SimulationBanner';
import { useNow } from '@/today/useNow';
import { useRoutes } from '@/today/useRoutes';
import { WhySheet } from '@/today/WhySheet';
import { departureCaption, reminderBody } from '@/today/words';
import { EmptyState } from '@/ui/EmptyState';
import { useStateHaptic } from '@/ui/haptics';
import { useMotion } from '@/ui/motion';
import { Press } from '@/ui/Press';
import { useCommute } from '@/useCommute';

const { color, type } = theme;

// Stroke icons for the two empty states: a route between two points, and a circled exclamation mark.
const routeIcon = 'M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15M3 19a3 3 0 1 0 6 0 3 3 0 1 0-6 0M15 5a3 3 0 1 0 6 0 3 3 0 1 0-6 0';
const alertIcon = 'M12 8v4M12 16h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0';

export default function TodayScreen() {
  const { commute: own } = useCommute();
  const demo = useDemo();
  // The commute for the day the screen is about (D5): its own arrive-by when it has one, and otherwise the stored
  // commute itself, the very same object, so an ordinary day fetches and shows exactly what it always has. It changes
  // only when the day does, never on a tick of the clock.
  const clock = useNow(own);
  const dayMs = commuteDayAt(own, clock).getTime();
  const today = useMemo(() => effectiveCommute(own, { date: new Date(dayMs), direction: 'work' }), [own, dayMs]);
  // Saved routes come with the commute they were fetched for, and bypass the day's. The commuter's own stays on the
  // phone, untouched, and is still the one routes are fetched and the morning reminders are set for.
  const commute = demo.saved ? savedCommute : today;
  const { data, error, loading, refresh } = useRoutes(today, demo.saved);
  // A public holiday (W6) says so in place of the decision line, live only: Demo mode ignores holidays.
  const holiday = demo.on ? null : isPublicHoliday(new Date(dayMs));
  // A refresh clears the error while it runs. The error box stays up through it, saying "Trying…", so a retry that
  // fails again does not take the box away and bring it straight back.
  const [shownError, setShownError] = useState(error);
  if (shownError !== error && (error !== null || !loading)) setShownError(error);
  const { enter, exit, layout } = useMotion();
  // The first load shows the hero and the route card as placeholders at their real size; a retry after a failed
  // first load shows the error box saying "Trying…" instead.
  const firstLoad = loading && !data && !shownError;
  const [selectedId, setSelectedId] = useState<string>();
  const now = useNow(data);
  const [demoOpen, setDemoOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);

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

  // Reminders: the morning ones the commuter never has to think about, and the one-off one behind "Remind me at 7:55".
  // Fresh numbers whenever the app comes forward or a reminder is tapped; no polling in between.
  const body = evaluation ? reminderBody(evaluation) : '';
  useDailyReminder(own);
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
      {/* Moves with the banner above it as that comes and goes, instead of jumping by its height. Pulling it down
          fetches again; the spinner shows while fresh numbers are on their way over ones already on screen. */}
      <Animated.ScrollView
        layout={layout}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading && !!data}
            onRefresh={refresh}
            tintColor={color.accent}
            colors={[color.accent]}
            progressBackgroundColor={color.surface}
          />
        }
      >
        <Hero
          commute={commute}
          evaluation={evaluation}
          draft={draft}
          rain={data?.rain}
          loading={firstLoad}
          holiday={holiday}
          onWhy={() => setWhyOpen(true)}
        />

        {/* Late, the notice takes the routes' place. The routes stay above it only while switching gets back on time.
            Over them, the departures Fika checked to get there (W1), which go when the routes do. */}
        {data && evaluation && (!noticeCard || evaluation.betterRouteId) && (
          <>
            <DepartureWindow blocks={departureWindow(data.samples, commute, evaluation, demo.simulation)} />
            <RouteList
              routes={routes}
              caption={departureCaption(evaluation)}
              onSelect={setSelectedId}
            />
          </>
        )}
        {noticeCard}
        {data && !hasRoute && (
          <View style={styles.inset}>
            <EmptyState
              icon={routeIcon}
              title="No driving route"
              body={`Fika found no way to drive from ${commute.origin.label} to ${commute.destination.label}.`}
              action={{ label: 'Edit commute', onPress: () => router.push('/setup') }}
            />
          </View>
        )}

        {firstLoad && <RouteListSkeleton />}

        {/* A failed fetch keeps the last numbers on screen above this, and says so. With nothing to keep, the error
            takes the routes' place. */}
        {shownError && data && (
          <Animated.View entering={enter} exiting={exit} style={styles.errorBox}>
            <Text style={styles.message}>
              Couldn’t refresh — these are the numbers Fika last got. {shownError}
            </Text>
            <Press accessibilityRole="button" onPress={refresh} disabled={loading} style={styles.retry}>
              <Text style={styles.retryLabel}>{loading ? 'Trying…' : 'Try again'}</Text>
            </Press>
          </Animated.View>
        )}
        {shownError && !data && (
          <Animated.View entering={enter} exiting={exit} style={styles.inset}>
            <EmptyState
              icon={alertIcon}
              title="Couldn’t get routes"
              body={shownError}
              action={{ label: loading ? 'Trying…' : 'Try again', onPress: refresh }}
            />
          </Animated.View>
        )}
      </Animated.ScrollView>
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
      {/* The maths behind the decision line (W2), from the same numbers the screen shows, Demo mode's included. */}
      <WhySheet
        visible={whyOpen && !!evaluation}
        evaluation={evaluation}
        explanation={evaluation && data ? explain(evaluation, commute, data.samples, demo.simulation) : undefined}
        onClose={() => setWhyOpen(false)}
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
  message: { ...type.note, color: color.textMuted, paddingHorizontal: theme.space.heroInset },
  errorBox: { gap: 12 },
  inset: { marginHorizontal: theme.space.screen },
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
