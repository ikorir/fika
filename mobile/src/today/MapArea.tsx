import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

// Placeholder for the route map and the header controls over it (map ticket #9).
export function MapArea() {
  return <View style={styles.map} />;
}

const styles = StyleSheet.create({
  map: { height: 250, backgroundColor: theme.color.mapBg },
});
