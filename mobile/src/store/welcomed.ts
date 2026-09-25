// First run: whether the commuter has been welcomed, and so which screen the app opens on.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext } from 'react';

import { COMMUTE_KEY } from '@/commute';

/** Present once the commuter has left the welcome screen, either way. */
export const WELCOMED_KEY = 'fika.welcomed';

export type FirstScreen = 'welcome' | 'today';

/**
 * The welcome screen only on a phone that has neither been welcomed nor stored a commute. A phone set up before
 * the welcome screen existed, such as the demo phone, opens on Today as it always has.
 */
export function firstScreen({ welcomed, storedCommute }: { welcomed: boolean; storedCommute: boolean }): FirstScreen {
  return welcomed || storedCommute ? 'today' : 'welcome';
}

/** The screen to open on, from what the phone has stored. */
export async function loadFirstScreen(): Promise<FirstScreen> {
  try {
    const [[, welcomed], [, commute]] = await AsyncStorage.multiGet([WELCOMED_KEY, COMMUTE_KEY]);
    return firstScreen({ welcomed: welcomed !== null, storedCommute: commute !== null });
  } catch {
    // Storage that will not answer could not remember a welcome either: open on Today, on the seeded commute.
    return 'today';
  }
}

/** Remembers the welcome, so it never shows again on this phone. */
export async function saveWelcomed(now = new Date()): Promise<void> {
  await AsyncStorage.setItem(WELCOMED_KEY, JSON.stringify({ version: 1, at: now.toISOString() }));
}

/** Given to the welcome screen by the root layout: leaves the welcome for good, whichever way in was chosen. */
export const WelcomedContext = createContext<() => void>(() => {});

export const useWelcomed = () => useContext(WelcomedContext);
