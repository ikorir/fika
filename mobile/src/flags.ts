// Feature flags (D7): anything that can fail live sits behind one, so it can be switched off before the demo without
// a rebuild. The build's defaults are app.json's `extra.flags`; this phone's overrides live under `fika.flags`.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export type FlagName = 'liveActivity' | 'backgroundReminder' | 'calendar' | 'recap' | 'secondContact';

/** The one AsyncStorage key this phone's flag overrides live under, as `{ version: 1, flags: { name: boolean } }`. */
export const FLAGS_KEY = 'fika.flags';

type Overrides = Partial<Record<FlagName, boolean>>;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** What app.json says. A flag it does not name is off. */
function buildDefault(name: FlagName): boolean {
  const flags: unknown = Constants.expoConfig?.extra?.flags;
  return isObject(flags) && flags[name] === true;
}

async function overrides(): Promise<Overrides> {
  try {
    const stored = await AsyncStorage.getItem(FLAGS_KEY);
    const parsed: unknown = stored === null ? null : JSON.parse(stored);
    if (!isObject(parsed) || !isObject(parsed.flags)) return {};
    const read: Overrides = {};
    for (const [name, on] of Object.entries(parsed.flags)) if (typeof on === 'boolean') read[name as FlagName] = on;
    return read;
  } catch {
    // Unreadable overrides are no overrides: the build's defaults hold.
    return {};
  }
}

/** Whether a feature is on: this phone's override when it has one, otherwise the build's default. */
export async function flag(name: FlagName): Promise<boolean> {
  return (await overrides())[name] ?? buildDefault(name);
}

/** Overrides a flag on this phone; null goes back to the build's default. */
export async function setFlag(name: FlagName, on: boolean | null): Promise<void> {
  const next = await overrides();
  if (on === null) delete next[name];
  else next[name] = on;
  await AsyncStorage.setItem(FLAGS_KEY, JSON.stringify({ version: 1, flags: next }));
}
