import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';

import { loadFirstScreen, saveWelcomed, WelcomedContext } from '@/store/welcomed';
import { theme } from '@/theme';
import { CommuteProvider, useSavedCommute } from '@/useCommute';

SplashScreen.preventAutoHideAsync();

// The app comes up out of the splash's black instead of popping in. An opacity change, not movement, so it stays with
// reduce motion on.
const fadeIn = FadeIn.duration(theme.motion.duration.slow).easing(theme.motion.easing);

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });
  const store = useSavedCommute(); // null until the saved commute has been read off the phone
  // Whether the welcome screen is up: null until the phone has answered, then true only on a first run.
  const [welcoming, setWelcoming] = useState<boolean | null>(null);
  useEffect(() => {
    loadFirstScreen().then((first) => setWelcoming(first === 'welcome'));
  }, []);
  const ready = (loaded || !!error) && store !== null && welcoming !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Either way out of the welcome screen, it is gone for good: now, and on every launch after. If the phone will not
  // store that, the commuter is simply welcomed again next time.
  const welcomed = useCallback(() => {
    setWelcoming(false);
    saveWelcomed().catch(() => {});
  }, []);

  if (!ready) return null;
  // Every bottom sheet is presented through the provider, above the screens (D4): never inside an RN Modal.
  return (
    <GestureHandlerRootView style={styles.root}>
      <Animated.View testID="root-fade" entering={fadeIn} style={styles.root}>
        <BottomSheetModalProvider>
          <CommuteProvider store={store}>
            <WelcomedContext.Provider value={welcomed}>
              <StatusBar style="light" />
              {/* Welcome while it is up, Today once it is gone: the router moves to Today when the guards swap. */}
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.color.bg } }}>
                <Stack.Protected guard={welcoming}>
                  <Stack.Screen name="welcome" />
                </Stack.Protected>
                <Stack.Protected guard={!welcoming}>
                  <Stack.Screen name="index" />
                </Stack.Protected>
                <Stack.Screen name="setup" />
              </Stack>
            </WelcomedContext.Provider>
          </CommuteProvider>
        </BottomSheetModalProvider>
      </Animated.View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
});
