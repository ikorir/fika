import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { theme } from '@/theme';
import { Press } from '@/ui/Press';

const { color, type } = theme;

type Props = {
  /** A stroke icon's path data, drawn on a 24 × 24 grid. */
  icon: string;
  title: string;
  /** One line on why there is nothing to show. */
  body: string;
  /** The one thing the commuter can do about it. */
  action?: { label: string; onPress: () => void };
};

/**
 * What a screen shows where its content would be: an icon, what is missing, why, and the one way forward. A card on
 * the screen's surface; the caller places it.
 */
export function EmptyState({ icon, title, body, action }: Props) {
  return (
    <View testID="empty-state" style={styles.card}>
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d={icon} />
      </Svg>
      <View style={styles.words}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      {action && (
        <Press accessibilityRole="button" onPress={action.onPress} style={styles.action}>
          <Text style={styles.actionLabel}>{action.label}</Text>
        </Press>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: theme.space.cardPad,
    borderRadius: theme.radius.card,
    backgroundColor: color.surface,
  },
  words: { gap: 4 },
  title: { ...type.rowTitle, color: color.text },
  body: { ...type.note, color: color.textMuted },
  action: {
    height: theme.size.buttonSecondary,
    borderRadius: theme.radius.pill,
    backgroundColor: color.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { ...type.buttonSecondary, color: color.text },
});
