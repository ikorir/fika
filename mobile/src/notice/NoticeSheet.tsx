import { StyleSheet, Text, View } from 'react-native';
import { Path } from 'react-native-svg';

import type { Commute } from '@/contract';
import { Icon, LockedChips, recipient, sendPath } from '@/notice/NoticeParts';
import { shareNotice, smsNotice, whatsAppNotice } from '@/notice/send';
import type { Notice } from '@/notice/useNotice';
import type { Language, Tone, Voice } from '@/notice/voice';
import { LanguageChips, ToneSwitch } from '@/notice/VoiceControls';
import { theme } from '@/theme';
import { Press } from '@/ui/Press';
import { Sheet, SheetTextInput } from '@/ui/Sheet';

const { color, type } = theme;

type Props = {
  visible: boolean;
  notice: Notice | null;
  contact: Commute['contact'];
  voice: Voice;
  onTone: (tone: Tone) => void;
  onLanguage: (language: Language) => void;
  onEdit: (text: string) => void;
  onClose: () => void;
};

// Bottom sheet over the late screen: the tone and language it is written in, who it goes to, the editable message,
// its locked numbers, and the ways to send. Switching tone or language writes the message again; the ETA and the
// lateness are the same in every one of them. With the keyboard up the sheet rides above it and scrolls, so the
// send buttons are still there under the message.
export function NoticeSheet({ visible, notice, contact, voice, onTone, onLanguage, onEdit, onClose }: Props) {
  return (
    <Sheet
      visible={visible}
      title="Late notice"
      onClose={onClose}
      header={
        <>
          <View style={styles.tone}>
            <ToneSwitch tone={voice.tone} onChange={onTone} />
          </View>
          <View style={styles.spacer} />
        </>
      }
    >
      {notice && (
        <>
          <LanguageChips language={voice.language} onChange={onLanguage} />

          <View style={styles.message}>
            <View style={styles.toRow}>
              <Text style={styles.toLabel}>To</Text>
              <Text style={styles.to} numberOfLines={1}>
                {recipient(contact)}
              </Text>
            </View>
            <SheetTextInput
              accessibilityLabel="Message"
              value={notice.text}
              onChangeText={onEdit}
              multiline
              textAlignVertical="top"
              selectionColor={color.accent}
              style={styles.input}
            />
          </View>

          <LockedChips notice={notice} caption />

          <Press
            accessibilityRole="button"
            onPress={() => whatsAppNotice(contact.phone, notice.text)}
            style={styles.primary}
          >
            <Icon size={22} stroke={color.onAccent} width={2}>
              <Path d={sendPath} />
            </Icon>
            <Text style={styles.primaryLabel}>Send on WhatsApp</Text>
          </Press>
          <View style={styles.secondaryRow}>
            <Press
              accessibilityRole="button"
              onPress={() => smsNotice(contact.phone, notice.text)}
              style={styles.secondary}
            >
              <Icon size={20} stroke={color.text} width={1.8}>
                <Path d="M4 5h16v11H9l-5 4z" />
              </Icon>
              <Text style={styles.secondaryLabel}>SMS</Text>
            </Press>
            <Press accessibilityRole="button" onPress={() => shareNotice(notice.text)} style={styles.secondary}>
              <Icon size={20} stroke={color.text} width={1.8}>
                <Path d="M12 15V4M8 8l4-4 4 4M5 12v7h14v-7" />
              </Icon>
              <Text style={styles.secondaryLabel}>Share</Text>
            </Press>
          </View>

          <Text style={styles.footnote}>Fika opens a prefilled message. Nothing goes out until you press send.</Text>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  // Centred on the sheet: the spacer after it is as wide as the close button before it.
  tone: { flex: 1, alignItems: 'center' },
  spacer: { width: theme.size.roundButton },
  message: { borderRadius: theme.radius.field, backgroundColor: color.surfaceRaised },
  toRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: color.hairline,
  },
  toLabel: { ...type.note, color: color.textMuted },
  to: { ...type.recipient, color: color.text, flexShrink: 1 },
  input: { ...type.noticeEditor, color: color.text, minHeight: 138, paddingTop: 14, paddingBottom: 14, paddingHorizontal: 16 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: theme.size.button,
    borderRadius: theme.radius.pill,
    backgroundColor: color.accent,
  },
  primaryLabel: { ...type.button, color: color.onAccent },
  secondaryRow: { flexDirection: 'row', gap: 10 },
  secondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: theme.size.buttonSecondary,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surfaceRaised,
  },
  secondaryLabel: { ...type.buttonSecondary, color: color.text },
  footnote: { ...type.meta, lineHeight: 18, color: color.textMuted, textAlign: 'center' },
});
