// Commute setup: the whole commute on one screen, saved on this phone only. Design: design/screens/Setup.dc.html.
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { commuteProblems, extraMinLabel } from '@/commute';
import type { Commute } from '@/contract';
import { AddressRow, Card, InputRow, PickRow } from '@/setup/Rows';
import { AddressSheet } from '@/setup/AddressSheet';
import { type Option, PickerSheet } from '@/setup/PickerSheet';
import { TimeSheet } from '@/setup/TimeSheet';
import { theme } from '@/theme';
import { formatClock } from '@/time';
import { useCommute } from '@/useCommute';

const { color, type } = theme;

const minutes = (values: number[]): Option<number>[] => values.map((value) => ({ value, label: `${value} min` }));
const BUFFERS = minutes([0, 5, 10, 15, 20, 30]);
const EXTRAS = minutes([0, 5, 10, 15, 20]);
// Relationships that tell the notice how to sound: everything but a friend or a partner gets the professional tone.
const RELATIONSHIPS: Option<string>[] = ['manager', 'colleague', 'client', 'lecturer', 'friend', 'partner'].map(
  (value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }),
);
const MODES: { value: Commute['mode']; label: string }[] = [
  { value: 'drive', label: 'I drive' },
  { value: 'ride_hail', label: 'Ride-hail' },
];

// Which picker is open. One at a time, named by the field it changes.
type Open = 'origin' | 'destination' | 'arriveBy' | 'usualDeparture' | 'bufferMin' | 'extraMin' | 'relationship';

export default function SetupScreen() {
  const { commute, save } = useCommute();
  const [draft, setDraft] = useState<Commute>(commute);
  const [open, setOpen] = useState<Open | null>(null);
  const [saving, setSaving] = useState(false);
  // Nothing is flagged until the commuter has tried to save: a half-filled form is not a mistake yet.
  const [tried, setTried] = useState(false);

  const problems = commuteProblems(draft);
  const flagged = tried ? problems : {};

  const set = <K extends keyof Commute>(key: K, value: Commute[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setContact = (patch: Partial<Commute['contact']>) =>
    setDraft((d) => ({ ...d, contact: { ...d.contact, ...patch } }));
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const onSave = async () => {
    setTried(true);
    if (Object.keys(problems).length > 0) return;
    setSaving(true);
    await save(draft);
    close();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close without saving" onPress={close} style={[styles.round, styles.chrome]}>
              <Icon stroke={color.text} width={2}>
                <Path d="M6 6l12 12M18 6 6 18" />
              </Icon>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save commute"
              disabled={saving}
              onPress={onSave}
              style={[styles.round, styles.save, saving && styles.dim]}
            >
              <Icon stroke={color.onAccent} width={2.4}>
                <Path d="m5 12.5 4.5 4.5L19 7.5" />
              </Icon>
            </Pressable>
          </View>

          <Text style={styles.title} accessibilityRole="header">
            Your commute
          </Text>

          <Card>
            <AddressRow icon="from" label="From" value={draft.origin.label} problem={flagged.origin} onPress={() => setOpen('origin')} />
            <AddressRow icon="to" label="To" value={draft.destination.label} problem={flagged.destination} onPress={() => setOpen('destination')} />
          </Card>

          <Card>
            <PickRow icon="flag" label="Arrive by" value={formatClock(draft.arriveBy)} onPress={() => setOpen('arriveBy')} />
            <PickRow icon="clock" label="Usual departure" value={formatClock(draft.usualDeparture)} onPress={() => setOpen('usualDeparture')} />
            <PickRow icon="shield" label="Buffer" value={`${draft.bufferMin} min`} onPress={() => setOpen('bufferMin')} />
            <PickRow icon="extra" label={extraMinLabel(draft.mode)} value={`${draft.extraMin} min`} onPress={() => setOpen('extraMin')} />
          </Card>

          <View style={styles.modes} accessibilityRole="radiogroup" accessibilityLabel="How you travel">
            {MODES.map(({ value, label }) => {
              const on = draft.mode === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on, selected: on }}
                  onPress={() => set('mode', value)}
                  style={[styles.mode, on && styles.modeOn]}
                >
                  <Text style={styles.modeLabel}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who to tell if you are late</Text>
            <Card>
              <InputRow
                icon="person"
                label="Name"
                problem={flagged.name}
                value={draft.contact.name}
                placeholder="Mary"
                autoCapitalize="words"
                onChangeText={(name) => setContact({ name })}
              />
              <InputRow
                icon="phone"
                label="Phone"
                problem={flagged.phone}
                value={draft.contact.phone}
                placeholder="0712 345 678"
                keyboardType="phone-pad"
                onChangeText={(phone) => setContact({ phone })}
              />
              <PickRow
                icon="badge"
                label="Relationship"
                value={draft.contact.relationship[0].toUpperCase() + draft.contact.relationship.slice(1)}
                onPress={() => setOpen('relationship')}
              />
            </Card>
          </View>

          <Text style={styles.footnote}>Saved on this phone only. No account needed.</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <AddressSheet
        visible={open === 'origin'}
        title="From"
        onPick={(origin) => {
          set('origin', origin);
          setOpen(null);
        }}
        onClose={() => setOpen(null)}
      />
      <AddressSheet
        visible={open === 'destination'}
        title="To"
        onPick={(destination) => {
          set('destination', destination);
          setOpen(null);
        }}
        onClose={() => setOpen(null)}
      />
      <TimeSheet
        visible={open === 'arriveBy'}
        title="Arrive by"
        value={draft.arriveBy}
        onChange={(v) => set('arriveBy', v)}
        onClose={() => setOpen(null)}
      />
      <TimeSheet
        visible={open === 'usualDeparture'}
        title="Usual departure"
        value={draft.usualDeparture}
        onChange={(v) => set('usualDeparture', v)}
        onClose={() => setOpen(null)}
      />
      <PickerSheet
        visible={open === 'bufferMin'}
        title="Buffer"
        options={BUFFERS}
        value={draft.bufferMin}
        onPick={(v) => {
          set('bufferMin', v);
          setOpen(null);
        }}
        onClose={() => setOpen(null)}
      />
      <PickerSheet
        visible={open === 'extraMin'}
        title={extraMinLabel(draft.mode)}
        options={EXTRAS}
        value={draft.extraMin}
        onPick={(v) => {
          set('extraMin', v);
          setOpen(null);
        }}
        onClose={() => setOpen(null)}
      />
      <PickerSheet
        visible={open === 'relationship'}
        title="Relationship"
        options={RELATIONSHIPS}
        value={draft.contact.relationship}
        onPick={(relationship) => {
          setContact({ relationship });
          setOpen(null);
        }}
        onClose={() => setOpen(null)}
      />
    </SafeAreaView>
  );
}

function Icon({ stroke, width, children }: { stroke: string; width: number; children: React.ReactNode }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { flexGrow: 1, paddingHorizontal: theme.space.screen, paddingBottom: 24, gap: theme.space.gap },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: {
    width: theme.size.roundButton,
    height: theme.size.roundButton,
    borderRadius: theme.size.roundButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chrome: { borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  save: { backgroundColor: color.accent },
  dim: { opacity: 0.5 },
  title: { ...type.title, color: color.text, paddingHorizontal: 4 },
  modes: { flexDirection: 'row', padding: 3, borderRadius: 24, backgroundColor: color.surface },
  mode: { flex: 1, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  modeOn: { backgroundColor: color.segmentOn },
  modeLabel: { ...type.segment, color: color.text },
  section: { gap: 8 },
  sectionTitle: { ...type.cardTitle, color: color.text, paddingHorizontal: 6 },
  footnote: { ...type.meta, lineHeight: 18, color: color.textMuted, textAlign: 'center', marginTop: 'auto', paddingTop: 8 },
});
