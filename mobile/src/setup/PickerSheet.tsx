// The sheet behind a row with a few sensible values: buffer, extra minutes, who to tell.
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { theme } from '@/theme';
import { Press } from '@/ui/Press';
import { Sheet } from '@/ui/Sheet';

const { color, type } = theme;

export type Option<T> = { value: T; label: string };

type Props<T extends string | number> = {
  visible: boolean;
  title: string;
  options: Option<T>[];
  value: T;
  onPick: (value: T) => void;
  onClose: () => void;
};

export function PickerSheet<T extends string | number>({ visible, title, options, value, onPick, onClose }: Props<T>) {
  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <ScrollView style={styles.list} contentContainerStyle={styles.card}>
        {options.map((option, i) => {
          const picked = option.value === value;
          return (
            <View key={option.value}>
              {i > 0 && <View style={styles.divider} />}
              <Press
                accessibilityRole="radio"
                accessibilityState={{ checked: picked, selected: picked }}
                onPress={() => onPick(option.value)}
                style={styles.row}
              >
                <Text style={[styles.label, picked && styles.labelPicked]}>{option.label}</Text>
                {picked && (
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color.accent} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="m5 12.5 4.5 4.5L19 7.5" />
                  </Svg>
                )}
              </Press>
            </View>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 360 },
  card: { borderRadius: theme.radius.card, backgroundColor: color.surfaceRaised },
  divider: { height: 1, marginLeft: 16, backgroundColor: color.hairline },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: theme.size.row, paddingHorizontal: 16 },
  label: { ...type.body, color: color.text, flex: 1 },
  labelPicked: { color: color.onAccentTint },
});
