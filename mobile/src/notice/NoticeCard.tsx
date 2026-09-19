import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Commute } from '@/contract';
import { LockedChips, recipient } from '@/notice/NoticeParts';
import type { Notice } from '@/notice/useNotice';
import { theme } from '@/theme';

const { color, type } = theme;

type Props = { notice: Notice; contact: Commute['contact']; onPress: () => void };

// The late state's preview of the notice. Tapping it opens the editor, as "Review and send notice" does.
export function NoticeCard({ notice, contact, onPress }: Props) {
  const to = recipient(contact);
  return (
    <Pressable
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
      <Text style={styles.text}>{notice.text}</Text>
      <LockedChips notice={notice} />
    </Pressable>
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
