import { Animated, StyleSheet, Text, View } from 'react-native';

import type { Commute, Evaluation } from '@/contract';
import type { Draft } from '@/draft/useDraft';
import { usePulse } from '@/draft/usePulse';
import { theme } from '@/theme';
import { formatClock } from '@/time';
import { conditionsNote, decisionLine, heroText, pastLeaveBy } from '@/today/words';

const { color, type } = theme;

const stateStyle: Record<Evaluation['state'], { label: string; color: string; tint: string }> = {
  on_time: { label: 'On time', color: color.onTime, tint: color.onTimeTint },
  at_risk: { label: 'At risk', color: color.atRisk, tint: color.atRiskTint },
  late: { label: 'Late', color: color.late, tint: color.lateTint },
};

type Props = { commute: Commute; evaluation?: Evaluation; draft?: Draft };

// Status pill, commute summary, leave-by / ETA, decision line and conditions note.
// Without an evaluation (loading, or no route) only the summary shows. The decision line and conditions note are
// Claude's when it has written them for these facts, and Fika's own template until then.
export function Hero({ commute, evaluation, draft }: Props) {
  const opacity = usePulse(draft?.loading ?? false);
  const summary = (
    <Text style={styles.summary} numberOfLines={1}>
      {commute.origin.label} to {commute.destination.label} · arrive by {formatClock(commute.arriveBy)}
    </Text>
  );
  if (!evaluation) return <View style={styles.hero}>{summary}</View>;

  const state = stateStyle[evaluation.state];
  const hero = heroText(evaluation, commute);
  const past = pastLeaveBy(evaluation);
  return (
    <View style={styles.hero}>
      <View style={styles.statusLine}>
        <View style={[styles.pill, { backgroundColor: state.tint }]}>
          <View style={[styles.dot, { backgroundColor: state.color }]} />
          <Text style={[styles.pillLabel, { color: state.color }]}>{state.label}</Text>
        </View>
        {summary}
      </View>

      <View style={styles.timeRow}>
        <View>
          <Text style={styles.label}>{hero.label}</Text>
          <Text style={[styles.time, evaluation.state !== 'on_time' && { color: state.color }]}>{hero.value}</Text>
        </View>
        <View style={styles.aside}>
          <Text style={styles.primary}>{hero.primary}</Text>
          <Text style={styles.secondary}>{hero.secondary}</Text>
        </View>
      </View>

      {past && <Text style={[styles.past, { color: state.color }]}>{past}</Text>}
      <Animated.View style={[styles.words, { opacity }]}>
        <Text style={styles.decision}>{draft?.words?.decision_line ?? decisionLine(evaluation, commute)}</Text>
        <Text style={styles.note}>{draft?.words?.conditions_note ?? conditionsNote(evaluation)}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: theme.space.heroInset, gap: 8 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: theme.size.chip,
    paddingHorizontal: 12,
    borderRadius: theme.size.chip / 2,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillLabel: type.status,
  summary: { ...type.note, color: color.textMuted, flexShrink: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  label: { ...type.heroLabel, color: color.textMuted },
  time: { ...type.hero, color: color.text },
  aside: { alignItems: 'flex-end', gap: 2, paddingBottom: 8 },
  primary: { ...type.heroAside, color: color.text },
  secondary: { ...type.note, color: color.textMuted },
  past: type.callout,
  words: { gap: 8 },
  decision: { ...type.decision, color: color.text, marginTop: 2 },
  note: { ...type.note, color: color.textMuted },
});
