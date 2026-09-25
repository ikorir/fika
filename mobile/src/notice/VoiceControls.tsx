import { StyleSheet, Text, View } from 'react-native';

import { LANGUAGES, TONES, type Language, type Tone } from '@/notice/voice';
import { theme } from '@/theme';
import { Press } from '@/ui/Press';

const { color, type } = theme;

/** Manager or Friend, as one segmented switch. */
export function ToneSwitch({ tone, onChange }: { tone: Tone; onChange: (tone: Tone) => void }) {
  return (
    <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel="Tone">
      {TONES.map(({ value, label }) => {
        const on = value === tone;
        return (
          <Press
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, selected: on }}
            haptic="select"
            onPress={() => onChange(value)}
            style={[styles.segmentItem, on && styles.segmentItemOn]}
          >
            <Text style={styles.label}>{label}</Text>
          </Press>
        );
      })}
    </View>
  );
}

/** English, Swahili or Sheng, as chips. */
export function LanguageChips({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  return (
    <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Language">
      {LANGUAGES.map(({ value, label }) => {
        const on = value === language;
        return (
          <Press
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, selected: on }}
            haptic="select"
            onPress={() => onChange(value)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{label}</Text>
          </Press>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', padding: 3, borderRadius: theme.radius.pill, backgroundColor: color.segmentTrack },
  segmentItem: {
    height: theme.size.segment,
    paddingHorizontal: 18,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemOn: { backgroundColor: color.segmentOn },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    height: theme.size.chipButton,
    paddingHorizontal: 16,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { borderColor: color.accent, backgroundColor: color.accentFaint },
  label: { ...type.segment, color: color.text },
  labelOn: { color: color.onAccentTint },
});
