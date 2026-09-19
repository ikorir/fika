import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/theme';

// Placeholder for the commute setup screen (#10).
export default function SetupScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Your commute</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.bg, paddingHorizontal: theme.space.heroInset },
  title: { ...theme.type.title, color: theme.color.text, marginTop: 16 },
});
