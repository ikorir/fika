import { StyleSheet, Text, View } from 'react-native';

import type { Evaluation } from '@/contract';
import type { Explanation } from '@/engine/explain';
import type { WindowBlock } from '@/engine/window';
import { theme } from '@/theme';
import { formatTime } from '@/time';
import { ruleLine, standingWords, whyReason, whyTitle } from '@/today/words';
import { Sheet } from '@/ui/Sheet';
import { LARGE_TEXT_CAP } from '@/ui/useFontScale';

const { color, type } = theme;

const tone: Record<WindowBlock['kind'], string> = { early: color.onTime, tight: color.atRisk, late: color.late };

type Props = {
  visible: boolean;
  evaluation?: Evaluation;
  explanation?: Explanation;
  onClose: () => void;
};

// "Why this time" (W2): the maths behind the decision line. The rule in one line, then every departure Fika checked
// with its arrival in the colour of how it stands and the chosen one marked, then why that one. The engine did the
// sums (engine/explain.ts); this only shows them.
export function WhySheet({ visible, evaluation, explanation, onClose }: Props) {
  return (
    <Sheet visible={visible} title={evaluation ? whyTitle(evaluation) : 'Why this time'} onClose={onClose}>
      {evaluation && explanation && (
        <>
          <Text style={styles.rule}>{ruleLine(explanation)}</Text>
          <View style={styles.card}>
            {explanation.rows.map((r, i) => (
              <View key={r.departAt}>
                {i > 0 && <View style={styles.divider} />}
                <View
                  testID="why-row"
                  accessible
                  accessibilityLabel={`Leave ${formatTime(r.departAt)}, arrive ${formatTime(r.arriveAt)} ${r.route}, ${
                    standingWords[r.kind]
                  }${r.chosen ? ', chosen' : ''}`}
                  style={styles.row}
                >
                  <Text style={styles.time} maxFontSizeMultiplier={LARGE_TEXT_CAP}>
                    {formatTime(r.departAt)}
                  </Text>
                  <View style={styles.body}>
                    <Text style={styles.route} numberOfLines={1} maxFontSizeMultiplier={LARGE_TEXT_CAP}>
                      {r.route}
                    </Text>
                    {r.chosen && (
                      <Text style={styles.chosen} maxFontSizeMultiplier={LARGE_TEXT_CAP}>
                        Chosen
                      </Text>
                    )}
                  </View>
                  <View style={styles.end}>
                    <Text style={[styles.arrive, { color: tone[r.kind] }]} maxFontSizeMultiplier={LARGE_TEXT_CAP}>
                      {`arrive ${formatTime(r.arriveAt)}`}
                    </Text>
                    <Text style={styles.standing} maxFontSizeMultiplier={LARGE_TEXT_CAP}>
                      {standingWords[r.kind]}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
          <Text style={styles.reason}>{whyReason(explanation, evaluation)}</Text>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  rule: { ...type.decision, color: color.text },
  card: { borderRadius: theme.radius.field, backgroundColor: color.surfaceRaised, paddingVertical: 4 },
  divider: { height: 1, marginLeft: theme.space.cardPad, backgroundColor: color.hairline },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: theme.size.row,
    paddingVertical: 8,
    paddingHorizontal: theme.space.cardPad,
  },
  time: { ...type.rowTime, color: color.text, minWidth: 44 },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  route: { ...type.meta, color: color.textMuted, flexShrink: 1 },
  chosen: {
    ...type.tag,
    color: color.onAccentTint,
    backgroundColor: color.accentTint,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 9,
    overflow: 'hidden',
  },
  end: { alignItems: 'flex-end', gap: 2 },
  arrive: type.metaStrong,
  standing: { ...type.meta, color: color.textMuted },
  reason: { ...type.note, color: color.textBody },
});
