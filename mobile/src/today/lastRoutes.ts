// The last routes response, kept on the phone so a failed fetch never leaves the screen blank.
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Commute, RoutesResponse } from '@/contract';

/** The one AsyncStorage key the last response lives under. */
export const LAST_ROUTES_KEY = 'fika.last-routes';

/** What the stored response was fetched for, so an edited commute never shows the old one's routes. */
const fetchedFor = (c: Commute) =>
  JSON.stringify([c.origin.location, c.destination.location, c.arriveBy, c.usualDeparture]);

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Enough of a check that the screen can render it: the engine deals with the rest. */
function isRoutesResponse(v: unknown): v is RoutesResponse {
  return isObject(v) && typeof v.fetchedAt === 'string' && Array.isArray(v.samples);
}

export async function saveLastRoutes(commute: Commute, response: RoutesResponse): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_ROUTES_KEY, JSON.stringify({ for: fetchedFor(commute), response }));
  } catch {
    // Storage that will not answer costs the offline fallback, nothing else.
  }
}

/** The routes this commute was last shown, or nothing: never fetched, another commute's, or unreadable. */
export async function loadLastRoutes(commute: Commute): Promise<RoutesResponse | null> {
  try {
    const stored = await AsyncStorage.getItem(LAST_ROUTES_KEY);
    if (stored === null) return null;
    const saved: unknown = JSON.parse(stored);
    if (!isObject(saved) || saved.for !== fetchedFor(commute)) return null;
    return isRoutesResponse(saved.response) ? saved.response : null;
  } catch {
    return null;
  }
}
