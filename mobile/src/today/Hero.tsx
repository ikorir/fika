import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { LayoutAnimationConfig } from 'react-native-reanimated';

import type { Commute, Evaluation, Rain } from '@/contract';
import type { Draft } from '@/draft/useDraft';
import { theme } from '@/theme';
import { formatClock } from '@/time';
import { conditionsNote, decisionLine, heroText, holidayLine, pastLeaveBy } from '@/today/words';
import { isClockTime } from '@/ui/digits';
import { useMotion } from '@/ui/motion';
import { RollingDigits } from '@/ui/RollingDigits';
import { Skeleton } from '@/ui/Skeleton';
import { LARGE_TEXT_CAP, useFontScale } from '@/ui/useFontScale';
import { usePulse } from '@/ui/usePulse';
import { useStateColor } from '@/ui/useStateColor';

const { color, type } = theme;

// The hero time never measures more than this on screen, whatever the phone's text size.
const HERO_MAX = type.hero.fontSize * 1.2;

/**
 * The hero time's size at a text scale: 64 pt up to 1.3, then 52 pt so a large text size still leaves room beside it.
 * Either way it grows with the text size only until it measures 64 × 1.2 on screen.
 */
export function heroSize(scale: number) {
  const { fontSize, lineHeight } = scale > 1.3 ? type.heroCompact : type.hero;
  return { fontSize, lineHeight, maxFontSizeMultiplier: HERO_MAX / fontSize };
}

const stateLabel: Record<Evaluation['state'], string> = { on_time: 'On time', at_risk: 'At risk', late: 'Late' };
const stateColor: Record<Evaluation['state'], string> = { on_time: color.onTime, at_risk: color.atRisk, late: color.late };

// The status pill's width with "On time" in it, for its placeholder.
const PILL_WIDTH = 88;

type Props = {
  commute: Commute;
  evaluation?: Evaluation;
  draft?: Draft;
  rain?: Rain;
  loading?: boolean;
  /** The public holiday the day is (W6), live only: it takes the decision line's place. */
  holiday?: string | null;
};

// Status pill, commute summary, leave-by / ETA, decision line and conditions note.
// Without an evaluation only the summary shows: beside shimmering placeholders while the first routes load, and alone
// when there is no route. The decision line and conditions note are Claude's when it has written them for these
// facts, and Fika's own template until then. On a public holiday the numbers stay and the decision line says so.
export function Hero({ commute, evaluation, draft, rain, loading, holiday }: Props) {
  const summary = (
    <Text style={styles.summary} numberOfLines={1} maxFontSizeMultiplier={LARGE_TEXT_CAP}>
      {commute.origin.label} to {commute.destination.label} · arrive by {formatClock(commute.arriveBy)}
    </Text>
  );
  let body: ReactNode = summary;
  if (evaluation)
    body = (
      <Facts commute={commute} evaluation={evaluation} draft={draft} rain={rain} holiday={holiday} summary={summary} />
    );
  else if (loading) body = <Placeholder summary={summary} />;
  return <View style={styles.hero}>{body}</View>;
}

type FactsProps = {
  commute: Commute;
  evaluation: Evaluation;
  draft?: Draft;
  rain?: Rain;
  holiday?: string | null;
  summary: ReactNode;
};

// The hero once there is an evaluation, fading in as a whole when it first shows. Its state colours tween from the
// state it first showed. The hero value rolls its digits from one time to the next; to or from a word ("Leave Now")
// it comes in with the shared enter and exit presets instead. The past-leave-by line comes and goes with the same
// presets, and the words under it move rather than jump. With reduce motion every change is instant.
function Facts({ commute, evaluation, draft, rain, holiday, summary }: FactsProps) {
  const pulse = usePulse(draft?.loading ?? false);
  const colors = useStateColor(evaluation.state);
  const { enter, exit, layout } = useMotion();
  const { maxFontSizeMultiplier, ...size } = heroSize(useFontScale());
  const hero = heroText(evaluation, commute);
  const past = pastLeaveBy(evaluation);
  return (
    <Animated.View testID="hero-facts" entering={enter} style={styles.stack}>
      {/* Only this view comes in on the first frame; everything inside animates only when it changes after that. */}
      <LayoutAnimationConfig skipEntering>
        <View style={styles.statusLine}>
          <Animated.View testID="status-pill" style={[styles.pill, colors.background]}>
            <Animated.View style={[styles.dot, colors.fill]} />
            <Animated.Text style={[styles.pillLabel, colors.foreground]} maxFontSizeMultiplier={LARGE_TEXT_CAP}>
              {stateLabel[evaluation.state]}
            </Animated.Text>
          </Animated.View>
          {summary}
        </View>

        <View style={styles.timeRow}>
          <View>
            <Text style={styles.label} maxFontSizeMultiplier={LARGE_TEXT_CAP}>
              {hero.label}
            </Text>
            {/* Keyed so that every time is one element, whose digits roll, and each word is its own, which crossfades. */}
            <Animated.View
              key={isClockTime(hero.value) ? 'clock' : hero.value}
              testID="hero-value"
              entering={enter}
              exiting={exit}
            >
              <RollingDigits
                text={hero.value}
                style={[styles.time, size, colors.alert]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              />
            </Animated.View>
          </View>
          <View style={styles.aside}>
            <Text style={styles.primary} maxFontSizeMultiplier={LARGE_TEXT_CAP}>
              {hero.primary}
            </Text>
            <Text style={styles.secondary} maxFontSizeMultiplier={LARGE_TEXT_CAP}>
              {hero.secondary}
            </Text>
          </View>
        </View>

        {past && (
          <Animated.Text entering={enter} exiting={exit} style={[styles.past, { color: stateColor[evaluation.state] }]}>
            {past}
          </Animated.Text>
        )}
        <Animated.View layout={layout} style={[styles.words, pulse]}>
          <Text style={styles.decision}>
            {holiday ? holidayLine(holiday) : (draft?.words?.decision_line ?? decisionLine(evaluation, commute))}
          </Text>
          <Text style={styles.note}>{draft?.words?.conditions_note ?? conditionsNote(evaluation, rain)}</Text>
        </Animated.View>
      </LayoutAnimationConfig>
    </Animated.View>
  );
}

// Placeholder blocks where the pill, the hero label, the hero time and the decision line will be, each the size of
// the real thing, with the commute summary already in place. They fade out when the facts arrive.
function Placeholder({ summary }: { summary: ReactNode }) {
  const { exit } = useMotion();
  return (
    <Skeleton>
      <Animated.View testID="hero-skeleton" exiting={exit} style={styles.stack}>
        <View style={styles.statusLine}>
          <Skeleton.Block width={PILL_WIDTH} height={theme.size.chip} radius={theme.size.chip / 2} />
          {summary}
        </View>
        <View accessible accessibilityLabel="Loading" accessibilityState={{ busy: true }} style={styles.stack}>
          <View>
            <View style={styles.labelLine}>
              <Skeleton.Block width={64} height={12} radius={4} />
            </View>
            <View style={styles.timeLine}>
              <Skeleton.Block width={136} height={52} radius={12} />
            </View>
          </View>
          <View style={styles.decisionLines}>
            <View style={styles.decisionLine}>
              <Skeleton.Block width="100%" height={14} radius={4} />
            </View>
            <View style={styles.decisionLine}>
              <Skeleton.Block width="70%" height={14} radius={4} />
            </View>
          </View>
        </View>
      </Animated.View>
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: theme.space.heroInset, gap: 8 },
  stack: { gap: 8 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: theme.size.chip,
    paddingHorizontal: 12,
    borderRadius: theme.size.chip / 2,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillLabel: type.status,
  summary: { ...type.note, color: color.textMuted, flexShrink: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  label: { ...type.heroLabel, color: color.textMuted },
  time: { ...type.hero, color: color.text },
  aside: { flexShrink: 1, alignItems: 'flex-end', gap: 2, paddingBottom: 8 },
  primary: { ...type.heroAside, color: color.text },
  secondary: { ...type.note, color: color.textMuted },
  past: type.callout,
  words: { gap: 8 },
  decision: { ...type.decision, color: color.text, marginTop: 2 },
  note: { ...type.note, color: color.textMuted },
  // Each placeholder sits in a line the height of the text it stands for.
  labelLine: { height: 17, justifyContent: 'center' },
  timeLine: { height: type.hero.lineHeight, justifyContent: 'center' },
  decisionLines: { marginTop: 2 },
  decisionLine: { height: type.decision.lineHeight, justifyContent: 'center' },
});
