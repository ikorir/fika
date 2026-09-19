import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import type { Commute } from '@/contract';
import type { Notice } from '@/notice/useNotice';
import { theme } from '@/theme';

const { color, type } = theme;

/** "Mary · manager". */
export const recipient = (contact: Commute['contact']) =>
  [contact.name.trim(), contact.relationship.trim()].filter(Boolean).join(' · ');

/**
 * The ETA and lateness in the notice, locked: they come from the route and aren't the AI's to change. Lateness is
 * rounded up to 5 minutes, as the message says it, so it reads "about".
 */
export function LockedChips({ notice, caption = false }: { notice: Notice; caption?: boolean }) {
  return (
    <View style={styles.row}>
      <Chip label={`ETA ${notice.eta}`} />
      <Chip label={`about ${notice.lateMin} min late`} />
      {caption && <Text style={styles.caption}>from your route, not AI</Text>}
    </View>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip} accessible accessibilityLabel={`${label}, locked`}>
      <Icon size={13} stroke={color.textChip} width={2.2}>
        <Rect x={5} y={11} width={14} height={9} rx={2} />
        <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </Icon>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

export function Icon({ size, stroke, width, children }: { size: number; stroke: string; width: number; children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

/** The paper plane on "Review and send notice" and "Send on WhatsApp". */
export const sendPath = 'M20 4 3 11l7 3 3 7zM10 14 20 4';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: theme.size.chip,
    paddingHorizontal: 10,
    borderRadius: theme.size.chip / 2,
    backgroundColor: color.control,
  },
  chipLabel: { ...type.metaStrong, color: color.textChip },
  caption: { ...type.meta, color: color.textMuted },
});
