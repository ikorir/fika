// The root layout: when the splash goes, how the app comes in, and which screen it opens on. It lives here and not
// beside the layout because Expo Router would take any file in `app/` for a route.
import 'react-native-gesture-handler/jestSetup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Text } from 'react-native';

import RootLayout from '@/app/_layout';
import { saveCommute } from '@/commute';
import { seedCommute } from '@/seed';
import { saveWelcomed, useWelcomed, WELCOMED_KEY } from '@/store/welcomed';
import { theme } from '@/theme';

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@expo-google-fonts/figtree', () => ({
  useFonts: () => [true, null],
  Figtree_400Regular: 1,
  Figtree_500Medium: 2,
  Figtree_600SemiBold: 3,
  Figtree_700Bold: 4,
  Figtree_800ExtraBold: 5,
}));
// The Stack as the layout declares it: each screen the router may show is a `Screen` element, and a protected one
// is there only while its guard holds. The welcome screen's stand-in leaves the welcome when pressed.
jest.mock('expo-router', () => {
  const React = require('react');
  const h = React.createElement;
  const Stack = ({ children }: { children: unknown }) => h('Stack', null, children);
  Stack.Screen = ({ name }: { name: string }) => h('Screen', { name }, name === 'welcome' ? h(mockLeave) : null);
  Stack.Protected = ({ guard, children }: { guard: boolean; children: unknown }) => (guard ? h(React.Fragment, null, children) : null);
  return { Stack };
});
function mockLeave() {
  const welcomed = useWelcomed();
  return <Text onPress={welcomed}>Try it with a sample commute</Text>;
}

const screens = () => screen.container.queryAll((n) => n.type === 'Screen').map((n) => n.props.name);

beforeEach(() => AsyncStorage.clear());
afterEach(() => jest.clearAllMocks());

describe('RootLayout', () => {
  it('keeps the splash up until the commute is read, then hides it and fades the app in over motion.duration.slow', async () => {
    let answer: (v: [string, string | null][]) => void = () => {};
    // (A spy on the storage stand-in's own mock: `Once`, never restored, or the stand-in loses its implementation.)
    jest.spyOn(AsyncStorage, 'multiGet').mockReturnValueOnce(new Promise((resolve) => (answer = resolve)) as never);
    await render(<RootLayout />);
    expect(screen.queryByTestId('root-fade')).not.toBeOnTheScreen();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();

    await act(async () => answer([['fika.welcomed', null], ['fika.commute', null]]));
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
    const root = screen.getByTestId('root-fade');
    expect(root.props.entering?.getDuration()).toBe(theme.motion.duration.slow);
    expect(root).toContainElement(screen.container.queryAll((n) => n.type === 'Stack')[0]);
  });

  it('opens a fresh phone on the welcome screen, with Today out of reach until the commuter picks a way in', async () => {
    await render(<RootLayout />);
    expect(screens()).toEqual(['welcome', 'setup']);
  });

  it('opens on Today on a phone with a commute stored, such as the demo phone, and never shows the welcome', async () => {
    await saveCommute(seedCommute);
    await render(<RootLayout />);
    expect(screens()).toEqual(['index', 'setup']);
  });

  it('opens on Today once the commuter has been welcomed', async () => {
    await saveWelcomed();
    await render(<RootLayout />);
    expect(screens()).toEqual(['index', 'setup']);
  });

  it('leaves the welcome for Today when the commuter picks a way in, and remembers it', async () => {
    await render(<RootLayout />);
    await act(async () => screen.getByText('Try it with a sample commute').props.onPress());
    expect(screens()).toEqual(['index', 'setup']);
    expect(await AsyncStorage.getItem(WELCOMED_KEY)).not.toBeNull();
  });
});
