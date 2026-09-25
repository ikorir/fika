import { Linking, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Evaluation } from '@/contract';
import { sendPath } from '@/notice/NoticeParts';
import type { Reminder } from '@/reminders/useReminders';
import { theme } from '@/theme';
import { formatTime } from '@/time';
import { betterRoute, routeName } from '@/today/words';
import { EmptyState } from '@/ui/EmptyState';
import { Press } from '@/ui/Press';
import { LARGE_TEXT_CAP } from '@/ui/useFontScale';

const { color } = theme;

type Props = {
  evaluation?: Evaluation;
  reminder: Reminder;
  onSelectRoute: (routeId: string) => void;
  onReviewNotice: () => void;
};

const bellPath = 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0';
const tickPath = 'M20 6 9 17l-5-5';
const bellOffPath = `${bellPath}M4 4l16 16`;

// The state's one primary action. On time: "Remind me at 7:55", which the commuter can tap again to drop. At risk:
// "Switch to <route>" when another route restores on time. Late: the same switch while there is still one to make
// (not yet on the road), otherwise "Review and send notice".
export function PrimaryAction({ evaluation, reminder, onSelectRoute, onReviewNotice }: Props) {
  const target = evaluation && betterRoute(evaluation);
  if (target)
    return (
      <Action icon="M4 8h13l-3-3M20 16H7l3 3" label={`Switch to ${routeName(target)}`} onPress={() => onSelectRoute(target.id)} />
    );
  if (evaluation?.state === 'late')
    return <Action icon={sendPath} label="Review and send notice" onPress={onReviewNotice} />;
  if (evaluation?.state === 'at_risk') return null;
  // Nothing to remind about once the leave-by has gone: the screen already says to leave now.
  if (evaluation?.state !== 'on_time' || !reminder.at) return null;
  const at = formatTime(reminder.at);
  // Asked for, but the phone will not let Fika notify and will not ask again: only its settings can change that.
  if (reminder.blocked)
    return (
      <EmptyState
        icon={bellOffPath}
        title="Reminders are off"
        body={`Turn on notifications for Fika in Settings to be reminded at ${at}.`}
        action={{ label: 'Open settings', onPress: openSettings }}
      />
    );
  return (
    <Action
      icon={reminder.set ? tickPath : bellPath}
      label={reminder.set ? `Reminder set for ${at}` : `Remind me at ${at}`}
      selected={reminder.set}
      onPress={reminder.toggle}
    />
  );
}

async function openSettings() {
  try {
    await Linking.openSettings();
  } catch (e) {
    console.warn('Could not open Settings', e);
  }
}

function Action({ icon, label, selected, onPress }: { icon: string; label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Press accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={styles.button}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color.onAccent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d={icon} />
      </Svg>
      {/* One line at any text size: the label shrinks to 80% before it is cut. */}
      <Text
        style={styles.label}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={LARGE_TEXT_CAP}
      >
        {label}
      </Text>
    </Press>
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
