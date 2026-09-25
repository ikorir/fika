import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { WindowBlock } from '@/engine/window';
import { theme } from '@/theme';
import { formatTime } from '@/time';
import { standingWords } from '@/today/words';
import { useMotion } from '@/ui/motion';
import { Press } from '@/ui/Press';
import { LARGE_TEXT_CAP } from '@/ui/useFontScale';

const { color, type } = theme;

const BLOCK_HEIGHT = 36;
const CHOSEN_HEIGHT = 46; // the chosen departure stands above the rest

const tint: Record<WindowBlock['kind'], string> = { early: color.onTimeTint, tight: color.atRiskTint, late: color.lateTint };
const tone: Record<WindowBlock['kind'], string> = { early: color.onTime, tight: color.atRisk, late: color.late };

/** "Leave 7:50 · arrive 8:52 via Limuru Road". */
const blockLine = (b: WindowBlock) => `Leave ${formatTime(b.departAt)} · arrive ${formatTime(b.arriveAt)} ${b.route}`;

type Props = { blocks: WindowBlock[] };

// The departures Fika checked (W1, D8), as a strip of blocks in the colour of how each arrives, the one the screen is
// about raised. Tapping a block says what leaving then gives, on one line under the strip; tapping it again, or
// another block, takes that line away. Nothing here changes what the screen decided.
export function DepartureWindow({ blocks }: Props) {
  const { enter, exit, layout } = useMotion();
  const [open, setOpen] = useState<string | null>(null);
  const shown = blocks.find((b) => b.departAt === open);
  return (
    <Animated.View testID="departure-window" entering={enter} exiting={exit} layout={layout} style={styles.strip}>
      <View style={styles.row}>
        {blocks.map((b) => (
          <Press
            key={b.departAt}
            accessibilityRole="button"
            accessibilityLabel={`${blockLine(b)}, ${standingWords[b.kind]}`}
            accessibilityState={{ selected: b.chosen, expanded: b.departAt === open }}
            haptic="select"
            onPress={() => setOpen(b.departAt === open ? null : b.departAt)}
            style={[
              styles.block,
              { backgroundColor: tint[b.kind], borderColor: b.chosen ? tone[b.kind] : color.hairline },
              b.chosen && styles.chosen,
            ]}
          >
            <Text
              style={[styles.time, { color: tone[b.kind] }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={LARGE_TEXT_CAP}
            >
              {formatTime(b.departAt)}
            </Text>
          </Press>
        ))}
      </View>
      {shown && (
        <Animated.Text
          key={shown.departAt}
          entering={enter}
          exiting={exit}
          style={styles.line}
          maxFontSizeMultiplier={LARGE_TEXT_CAP}
        >
          {blockLine(shown)}
        </Animated.Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  strip: { marginHorizontal: theme.space.screen, gap: 8 },
  // Bottom-aligned, so the chosen block rises above the others.
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  block: {
    flex: 1,
    height: BLOCK_HEIGHT,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chosen: { height: CHOSEN_HEIGHT, borderWidth: 1.5 },
  time: type.metaStrong,
  line: { ...type.note, color: color.textMuted, paddingHorizontal: 4 },
});
