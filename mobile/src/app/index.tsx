import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

export default function TodayScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Fika</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.bg },
  title: { ...theme.type.title, color: theme.color.text },
});
