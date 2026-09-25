import { Animated, StyleSheet, Text, View } from 'react-native';

import type { Commute } from '@/contract';
import { usePulse } from '@/draft/usePulse';
import { LockedChips, recipient } from '@/notice/NoticeParts';
import type { Notice } from '@/notice/useNotice';
import { theme } from '@/theme';
import { Press } from '@/ui/Press';

const { color, type } = theme;

type Props = { notice: Notice; contact: Commute['contact']; loading?: boolean; onPress: () => void };

// The late state's preview of the notice. Tapping it opens the editor, as "Review and send notice" does.
// The message breathes while Claude is still writing it; the words under it are Fika's own until then.
export function NoticeCard({ notice, contact, loading, onPress }: Props) {
  const opacity = usePulse(loading ?? false);
  const to = recipient(contact);
  return (
    <Press
      accessibilityRole="button"
      accessibilityHint="Opens the notice to review and send"
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Late notice</Text>
        {to !== '' && (
          <Text style={styles.to} numberOfLines={1}>
            to {to}
          </Text>
        )}
      </View>
      <Animated.Text style={[styles.text, { opacity }]}>{notice.text}</Animated.Text>
      <LockedChips notice={notice} />
    </Press>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.space.screen,
    borderRadius: theme.radius.card,
    backgroundColor: color.surface,
    gap: 10,
    paddingTop: 14,
    paddingBottom: theme.space.cardPad,
    paddingHorizontal: theme.space.cardPad,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { ...type.cardTitle, color: color.text },
  to: { ...type.meta, color: color.textMuted, flexShrink: 1 },
  text: { ...type.noticePreview, color: color.textBody },
});
