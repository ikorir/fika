import { Pressable, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Evaluation } from '@/contract';
import { sendPath } from '@/notice/NoticeParts';
import type { Reminder } from '@/reminders/useReminders';
import { theme } from '@/theme';
import { formatTime } from '@/time';
import { betterRoute, routeName } from '@/today/words';

const { color } = theme;

type Props = {
  evaluation?: Evaluation;
  reminder: Reminder;
  onSelectRoute: (routeId: string) => void;
  onReviewNotice: () => void;
};

const bellPath = 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0';
const tickPath = 'M20 6 9 17l-5-5';

// The state's one primary action. On time: "Remind me at 7:55", which the commuter can tap again to drop. At risk:
// "Switch to <route>" when another route restores on time. Late: "Review and send notice".
export function PrimaryAction({ evaluation, reminder, onSelectRoute, onReviewNotice }: Props) {
  if (evaluation?.state === 'late')
    return <Action icon={sendPath} label="Review and send notice" onPress={onReviewNotice} />;
  if (evaluation?.state === 'at_risk') {
    const target = betterRoute(evaluation);
    return target ? (
      <Action icon="M4 8h13l-3-3M20 16H7l3 3" label={`Switch to ${routeName(target)}`} onPress={() => onSelectRoute(target.id)} />
    ) : null;
  }
  // Nothing to remind about once the leave-by has gone: the screen already says to leave now.
  if (evaluation?.state !== 'on_time' || !reminder.at) return null;
  const at = formatTime(reminder.at);
  return (
    <Action
      icon={reminder.set ? tickPath : bellPath}
      label={reminder.set ? `Reminder set for ${at}` : `Remind me at ${at}`}
      selected={reminder.set}
      onPress={reminder.toggle}
    />
  );
}

function Action({ icon, label, selected, onPress }: { icon: string; label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={styles.button}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color.onAccent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d={icon} />
      </Svg>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: theme.size.button,
    paddingHorizontal: 20,
    borderRadius: theme.radius.pill,
    backgroundColor: color.accent,
  },
  label: { ...theme.type.button, color: color.onAccent, flexShrink: 1 },
});
