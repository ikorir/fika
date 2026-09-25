// The sheet behind From and To: type an address, pick it from Google's suggestions, and the commute keeps the place.
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { fetchPlace } from '@/api';
import type { Place } from '@/contract';
import { usePlaceSearch } from '@/setup/usePlaceSearch';
import { theme } from '@/theme';
import { Press } from '@/ui/Press';
import { Sheet, SheetTextInput } from '@/ui/Sheet';

const { color, type } = theme;

type Props = { visible: boolean; title: string; onPick: (place: Place) => void; onClose: () => void };

export function AddressSheet({ visible, title, onPick, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState<string | null>(null); // the suggestion being looked up
  const [failed, setFailed] = useState<string | null>(null);
  const lookup = useRef<AbortController | null>(null);
  const { suggestions, searching, error } = usePlaceSearch(query);

  // Every visit starts on an empty field, so the last commute's search is never in the way. A lookup still in
  // flight is dropped: an address the commuter backed out of must not land in the commute afterwards.
  const clear = () => {
    lookup.current?.abort();
    lookup.current = null;
    setQuery('');
    setPicking(null);
    setFailed(null);
  };
  const dismiss = () => {
    clear();
    onClose();
  };

  const pick = async (placeId: string) => {
    const controller = new AbortController();
    lookup.current = controller;
    setPicking(placeId);
    setFailed(null);
    try {
      const place = await fetchPlace(placeId, controller.signal);
      if (controller.signal.aborted) return;
      clear();
      onPick(place);
    } catch (e) {
      if (controller.signal.aborted) return;
      setFailed(e instanceof Error ? e.message : String(e));
      setPicking(null);
    }
  };

  const nothing = query.trim().length >= 2 && !searching && !failed && !error && suggestions.length === 0;

  return (
    <Sheet visible={visible} title={title} onClose={dismiss}>
      <View style={styles.field}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.textMuted} strokeWidth={1.8} strokeLinecap="round">
          <Circle cx={11} cy={11} r={7} />
          <Path d="m16.5 16.5 4.5 4.5" />
        </Svg>
        <SheetTextInput
          accessibilityLabel={`Search for ${title}`}
          autoFocus
          autoCorrect={false}
          placeholder="Search an address"
          placeholderTextColor={color.radioIdle}
          selectionColor={color.accent}
          style={styles.input}
          value={query}
          onChangeText={setQuery}
        />
        {searching && <ActivityIndicator color={color.textMuted} />}
      </View>

      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {suggestions.map((suggestion, i) => (
          <View key={suggestion.placeId}>
            {i > 0 && <View style={styles.divider} />}
            <Press
              accessibilityRole="button"
              disabled={picking !== null}
              onPress={() => pick(suggestion.placeId)}
              style={styles.row}
            >
              <Text style={styles.label} numberOfLines={2}>
                {suggestion.label}
              </Text>
              {picking === suggestion.placeId && <ActivityIndicator color={color.accent} />}
            </Press>
          </View>
        ))}
      </ScrollView>

      {failed && <Text style={styles.problem}>Couldn’t open that address. {failed}</Text>}
      {error && !failed && <Text style={styles.problem}>Couldn’t search for addresses. {error}</Text>}
      {nothing && <Text style={styles.note}>Nothing in Kenya matches that.</Text>}
      {!failed && !error && !nothing && suggestions.length === 0 && (
        <Text style={styles.note}>Start typing an address.</Text>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: theme.size.button,
    paddingHorizontal: 16,
    borderRadius: theme.radius.field,
    backgroundColor: color.surfaceRaised,
  },
  input: { ...type.body, color: color.text, flex: 1, paddingVertical: 8 },
  list: { maxHeight: 280 },
  divider: { height: 1, backgroundColor: color.hairline },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: theme.size.row, paddingVertical: 8 },
  label: { ...type.body, color: color.text, flex: 1 },
  note: { ...type.meta, color: color.textMuted, paddingHorizontal: 4, paddingBottom: 4 },
  problem: { ...type.meta, color: color.late, paddingHorizontal: 4, paddingBottom: 4 },
});
