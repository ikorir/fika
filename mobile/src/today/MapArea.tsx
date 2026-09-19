import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RouteView } from '@/contract';
import { theme } from '@/theme';
import { HeaderControls } from '@/today/HeaderControls';

type Props = {
  routes: RouteView[]; // drawn by the map (#9); `selected` marks the highlighted one
  onSelectRoute: (routeId: string) => void; // tapping a route line (#9)
  onRefresh: () => void;
  onDemo: () => void;
};

// Placeholder ground for the route map (#9), with the header controls floating over it.
export function MapArea({ onRefresh, onDemo }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.map}>
      <View style={[styles.controls, { top: insets.top + 6 }]}>
        <HeaderControls onRefresh={onRefresh} onDemo={onDemo} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 250, backgroundColor: theme.color.mapBg },
  controls: { position: 'absolute', left: theme.space.screen, right: theme.space.screen },
});
