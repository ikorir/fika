// The saved commute: its defaults, what it needs before it can be saved, and the one key it lives under.
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Commute, Contact, Place, Weekday } from '@/contract';
import { defaultTone } from '@/notice/voice';
import { seedCommute } from '@/seed';

/** The one AsyncStorage key the commute lives under. */
export const COMMUTE_KEY = 'fika.commute';

const blankPlace: Place = { placeId: '', label: '', location: { lat: 0, lng: 0 } };

/** A commute with nothing filled in yet: the defaults every field falls back to. */
export const emptyCommute: Commute = {
  version: 2,
  origin: blankPlace,
  destination: blankPlace,
  arriveBy: '09:00',
  usualDeparture: '08:00',
  bufferMin: 10,
  extraMin: 5,
  mode: 'drive',
  contact: { name: '', phone: '', relationship: 'manager' },
  quietWeekends: true,
  contacts: [{ name: '', phone: '', relationship: 'manager', tone: 'manager', language: 'en' }],
};

const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TONES: Contact['tone'][] = ['manager', 'friend'];
const LANGUAGES: Contact['language'][] = ['en', 'sw', 'sheng'];

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const place = (v: unknown, fallback: Place): Place => {
  if (!isObject(v) || typeof v.label !== 'string' || !isObject(v.location)) return fallback;
  const { lat, lng } = v.location;
  if (typeof lat !== 'number' || typeof lng !== 'number') return fallback;
  return { placeId: typeof v.placeId === 'string' ? v.placeId : '', label: v.label, location: { lat, lng } };
};
const isClock = (v: unknown): v is string => typeof v === 'string' && /^\d\d:\d\d$/.test(v);
const clock = (v: unknown, fallback: string) => (isClock(v) ? v : fallback);
const minutes = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : fallback;
const text = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
// A blank relationship would leave the late notice with no one to sound like, so it counts as never set.
const word = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v : fallback);
const oneOf = <T extends string>(v: unknown, values: T[], fallback: T): T =>
  values.includes(v as T) ? (v as T) : fallback;

const person = (v: Record<string, unknown>): Commute['contact'] => ({
  name: text(v.name),
  phone: text(v.phone),
  relationship: word(v.relationship, emptyCommute.contact.relationship),
});

/**
 * A contact with the voice its notice is written in. Where none is stored — every v1 commute — it is the voice the
 * notice has for that contact today: the tone their relationship suggests, in English.
 */
const withVoice = (who: Commute['contact'], stored: Record<string, unknown> = {}): Contact => ({
  ...who,
  tone: oneOf(stored.tone, TONES, defaultTone(who.relationship)),
  language: oneOf(stored.language, LANGUAGES, 'en'),
});

/** The days that have an arrive-by of their own, or nothing when none does. A time that cannot be read is dropped. */
function arriveByByDay(v: unknown): Commute['arriveByByDay'] {
  if (!isObject(v)) return undefined;
  const days: NonNullable<Commute['arriveByByDay']> = {};
  for (const day of WEEKDAYS) if (isClock(v[day])) days[day] = v[day];
  return Object.keys(days).length > 0 ? days : undefined;
}

/**
 * A part-filled commute — or whatever an older build stored — as a v2 commute, with every missing field replaced by
 * its default. A v1 commute (no `version`) loses nothing: its one contact becomes contacts[0], weekends are quiet, and
 * no day has an arrive-by of its own. `contact` is what every build before v2 reads and writes, so where it and
 * contacts[0] disagree about who the person is, `contact` wins, and the two always leave here the same.
 */
export function withDefaults(stored: unknown): Commute {
  const c = isObject(stored) ? stored : {};
  const listed = Array.isArray(c.contacts) ? c.contacts.filter(isObject) : [];
  const contact = person(isObject(c.contact) ? c.contact : (listed[0] ?? {}));
  const commute: Commute = {
    version: 2,
    origin: place(c.origin, emptyCommute.origin),
    destination: place(c.destination, emptyCommute.destination),
    arriveBy: clock(c.arriveBy, emptyCommute.arriveBy),
    usualDeparture: clock(c.usualDeparture, emptyCommute.usualDeparture),
    bufferMin: minutes(c.bufferMin, emptyCommute.bufferMin),
    extraMin: minutes(c.extraMin, emptyCommute.extraMin),
    mode: c.mode === 'ride_hail' ? 'ride_hail' : 'drive',
    contact,
    quietWeekends: typeof c.quietWeekends === 'boolean' ? c.quietWeekends : emptyCommute.quietWeekends,
    contacts: [withVoice(contact, listed[0]), ...listed.slice(1, 2).map((other) => withVoice(person(other), other))],
  };
  const days = arriveByByDay(c.arriveByByDay);
  if (days) commute.arriveByByDay = days;
  if (isObject(c.returnTrip) && isClock(c.returnTrip.homeBy)) commute.returnTrip = { homeBy: c.returnTrip.homeBy };
  return commute;
}

const KENYA_CODE = '254';

/**
 * A typed phone number as WhatsApp and SMS want it: international digits, no plus.
 * A Kenyan number written the way people write it here ("0712 345 678", "712345678") gets its country code.
 */
export function normalisePhone(typed: string): string {
  const digits = typed.replace(/\D/g, '');
  if (digits.startsWith('0')) return KENYA_CODE + digits.slice(1);
  if (/^[17]\d{8}$/.test(digits)) return KENYA_CODE + digits; // a Kenyan mobile without its leading zero
  return digits;
}

/** What is still missing, by setup field. Empty when the commute can be saved. */
export type CommuteProblems = Partial<Record<'origin' | 'destination' | 'name' | 'phone', string>>;

// A country code plus a national number: 12 digits in Kenya, never fewer than 11 anywhere.
const MIN_DIALABLE_DIGITS = 11;

/** The fields the commuter still has to fill in, with what to tell them. */
export function commuteProblems(commute: Commute): CommuteProblems {
  const problems: CommuteProblems = {};
  if (!commute.origin.label) problems.origin = 'Pick where you start from.';
  if (!commute.destination.label) problems.destination = 'Pick where you are going.';
  if (!commute.contact.name.trim()) problems.name = 'Add a name.';
  if (normalisePhone(commute.contact.phone).length < MIN_DIALABLE_DIGITS) problems.phone = 'Add a full phone number.';
  return problems;
}

/** The commute on this phone. The seeded one until the commuter saves theirs, so the demo never types an address. */
export async function loadCommute(): Promise<Commute> {
  try {
    const stored = await AsyncStorage.getItem(COMMUTE_KEY);
    if (stored === null) return seedCommute;
    const parsed: unknown = JSON.parse(stored);
    // Something that is not a commute at all is as good as nothing: the app opens on the commute it ships with.
    return isObject(parsed) ? withDefaults(parsed) : seedCommute;
  } catch {
    // Storage that will not answer, or nonsense in it: the app still has to open, on the commute it ships with.
    return seedCommute;
  }
}

/**
 * Stores the commute as v2 and answers with what was stored: the phone number is normalised on the way in, and
 * contacts[0] is the contact the setup screen edits.
 */
export async function saveCommute(commute: Commute): Promise<Commute> {
  const saved = withDefaults({ ...commute, contact: { ...commute.contact, phone: normalisePhone(commute.contact.phone) } });
  await AsyncStorage.setItem(COMMUTE_KEY, JSON.stringify(saved));
  return saved;
}

/** The extra minutes mean parking to a driver and waiting for the car to a rider. */
export const extraMinLabel = (mode: Commute['mode']) => (mode === 'drive' ? 'Parking time' : 'Pickup wait');
