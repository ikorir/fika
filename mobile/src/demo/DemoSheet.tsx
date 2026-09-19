import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import type { Commute, Evaluation, Sample } from '@/contract';
import { ACCIDENT_MIN, accident, midTrip } from '@/demo/presets';
import type { DemoMode } from '@/demo/useDemo';
import { theme } from '@/theme';
import { formatTime } from '@/time';
import { routeName } from '@/today/words';

const { color, type } = theme;
const CLOCK_STEP_MIN = 5;

type Props = {
  visible: boolean;
  onClose: () => void;
  demo: DemoMode;
  commute: Commute;
  samples: Sample[];
  evaluation?: Evaluation; // what the screen shows now: live while Demo mode is off
  onRestart: () => void; // the screen goes back to the route it first shows
};

// Bottom sheet: the Demo mode switch, the two scenarios, the app clock and "Reset to start".
// The scenarios work on the route the screen shows, so the accident hits the route the presenter is looking at.
export function DemoSheet({ visible, onClose, demo, commute, samples, evaluation, onRestart }: Props) {
  const insets = useSafeAreaInsets();
  const simulation = demo.simulation ?? {};
  const shown = evaluation?.routes.find((r) => r.selected);
  const trip = shown && midTrip(commute, samples, shown.id);
  const disabled = !demo.on || !evaluation;

  const toggleDemo = (on: boolean) => {
    if (on) return demo.turnOn(evaluation);
    demo.turnOff();
    onRestart();
  };
  const reset = () => {
    demo.reset();
    onRestart();
  };
  const toggleAccident = () =>
    shown && demo.change((s) => ({ ...s, delay: s.delay ? undefined : accident(shown) }));
  // Leaving the trip puts the clock back where the demo started.
  const toggleMidTrip = () =>
    trip && demo.change((s, first) => (s.midTrip ? { ...s, midTrip: undefined, clock: first.clock } : { ...s, ...trip }));
  const stepClock = (min: number) =>
    evaluation &&
    demo.change((s) => ({ ...s, clock: new Date(Date.parse(evaluation.now) + min * 60_000).toISOString() }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close Demo mode" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 34) }]}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
              <Icon size={20} stroke={color.text} width={2}>
                <Path d="M6 6l12 12M18 6 6 18" />
              </Icon>
            </Pressable>
            <Text style={styles.title} accessibilityRole="header">
              Demo mode
            </Text>
            <Switch
              accessibilityLabel="Demo mode"
              value={demo.on}
              onValueChange={toggleDemo}
              trackColor={{ false: color.switchOff, true: color.accent }}
              ios_backgroundColor={color.switchOff}
              thumbColor={color.text}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scenarios</Text>
            <View style={[styles.card, disabled && styles.disabled]}>
              <Scenario
                title={simulation.delay?.cause ?? `Accident on ${shown ? routeName(shown) : 'your route'}`}
                detail={`adds ${ACCIDENT_MIN} min to that route`}
                value={`+${ACCIDENT_MIN} min`}
                valueColor={color.atRisk}
                checked={!!simulation.delay}
                disabled={disabled}
                onPress={toggleAccident}
              />
              <View style={styles.divider} />
              <Scenario
                title="Advance clock to mid-trip"
                detail="shows the late state and the notice"
                value={trip ? formatTime(trip.clock) : ''}
                valueColor={color.textMuted}
                checked={!!simulation.midTrip}
                disabled={disabled}
                onPress={toggleMidTrip}
              />
            </View>
          </View>

          <View style={[styles.card, disabled && styles.disabled]}>
            <View style={styles.clockRow}>
              <Icon size={22} stroke={color.textMuted} width={1.8}>
                <Circle cx={12} cy={12} r={8.5} />
                <Path d="M12 7.5V12l3 2" />
              </Icon>
              <Text style={styles.clockLabel}>App clock</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Back ${CLOCK_STEP_MIN} minutes`}
                disabled={disabled}
                onPress={() => stepClock(-CLOCK_STEP_MIN)}
                style={styles.step}
              >
                <Icon size={18} stroke={color.text} width={2.2}>
                  <Path d="M6 12h12" />
                </Icon>
              </Pressable>
              <Text style={styles.clock}>{evaluation ? formatTime(evaluation.now) : '–'}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Forward ${CLOCK_STEP_MIN} minutes`}
                disabled={disabled}
                onPress={() => stepClock(CLOCK_STEP_MIN)}
                style={styles.step}
              >
                <Icon size={18} stroke={color.text} width={2.2}>
                  <Path d="M6 12h12M12 6v12" />
                </Icon>
              </Pressable>
            </View>
          </View>

          <Text style={styles.footnote}>A white SIMULATED TRAFFIC banner stays on screen while any of these are on.</Text>

          <Pressable
            accessibilityRole="button"
            disabled={!demo.on}
            onPress={reset}
            style={[styles.reset, !demo.on && styles.disabled]}
          >
            <Text style={styles.resetLabel}>Reset to start</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type ScenarioProps = {
  title: string;
  detail: string;
  value: string;
  valueColor: string;
  checked: boolean;
  disabled: boolean;
  onPress: () => void;
};

function Scenario({ title, detail, value, valueColor, checked, disabled, onPress }: ScenarioProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.scenario}
    >
      {checked ? (
        <View style={[styles.tick, styles.tickOn]}>
          <Icon size={14} stroke={color.onAccent} width={3}>
            <Path d="m5 12.5 4.5 4.5L19 7.5" />
          </Icon>
        </View>
      ) : (
        <View style={[styles.tick, styles.tickOff]} />
      )}
      <View style={styles.scenarioText}>
        <Text style={styles.scenarioTitle}>{title}</Text>
        <Text style={styles.scenarioDetail}>{detail}</Text>
      </View>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
    </Pressable>
  );
}

function Icon({ size, stroke, width, children }: { size: number; stroke: string; width: number; children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: theme.radius.sheet,
    borderTopRightRadius: theme.radius.sheet,
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  close: {
    width: theme.size.roundButton,
    height: theme.size.roundButton,
    borderRadius: theme.size.roundButton / 2,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.sheetTitle, color: color.text, flex: 1 },
  section: { gap: 8 },
  sectionTitle: { ...type.cardTitle, color: color.text, paddingHorizontal: 6 },
  card: { borderRadius: theme.radius.card, backgroundColor: color.surfaceRaised },
  disabled: { opacity: 0.4 },
  divider: { height: 1, marginLeft: 50, backgroundColor: color.hairline },
  scenario: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8, paddingHorizontal: 16 },
  tick: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tickOn: { backgroundColor: color.accent },
  tickOff: { borderWidth: 2, borderColor: color.radioIdle },
  scenarioText: { flex: 1, gap: 2 },
  scenarioTitle: { ...type.rowTitle, color: color.text },
  scenarioDetail: { ...type.meta, color: color.textMuted },
  value: { ...type.cardTitle },
  clockRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingLeft: 16, paddingRight: 10 },
  clockLabel: { ...type.body, color: color.text, flex: 1 },
  step: {
    width: theme.size.roundButton,
    height: theme.size.roundButton,
    borderRadius: theme.size.roundButton / 2,
    backgroundColor: color.controlRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clock: { ...type.clock, color: color.text, width: 52, textAlign: 'center' },
  footnote: { ...type.meta, lineHeight: 18, color: color.textMuted, paddingHorizontal: 6 },
  reset: { height: 48, alignItems: 'center', justifyContent: 'center' },
  resetLabel: { ...type.rowTitle, color: color.late },
});
