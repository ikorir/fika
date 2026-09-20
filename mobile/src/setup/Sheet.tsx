// The bottom sheet the setup screen picks values in: one title, one close button, and whatever the picker needs.
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { theme } from '@/theme';

const { color, type } = theme;

type Props = { visible: boolean; title: string; onClose: () => void; children: ReactNode };

export function Sheet({ visible, title, onClose, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel={`Close ${title}`} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 34) }]}>
            <View style={styles.header}>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.text} strokeWidth={2} strokeLinecap="round">
                  <Path d="M6 6l12 12M18 6 6 18" />
                </Svg>
              </Pressable>
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
            </View>
            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: color.scrim },
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
});
