// The saved commute: its defaults, what it needs before it can be saved, and the one key it lives under.
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Commute, Place } from '@/contract';
import { seedCommute } from '@/seed';

/** The one AsyncStorage key the commute lives under. */
export const COMMUTE_KEY = 'fika.commute';

const blankPlace: Place = { placeId: '', label: '', location: { lat: 0, lng: 0 } };

/** A commute with nothing filled in yet: the defaults every field falls back to. */
export const emptyCommute: Commute = {
  origin: blankPlace,
  destination: blankPlace,
  arriveBy: '09:00',
  usualDeparture: '08:00',
  bufferMin: 10,
  extraMin: 5,
  mode: 'drive',
  contact: { name: '', phone: '', relationship: 'manager' },
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const place = (v: unknown, fallback: Place): Place => {
  if (!isObject(v) || typeof v.label !== 'string' || !isObject(v.location)) return fallback;
  const { lat, lng } = v.location;
  if (typeof lat !== 'number' || typeof lng !== 'number') return fallback;
  return { placeId: typeof v.placeId === 'string' ? v.placeId : '', label: v.label, location: { lat, lng } };
};
const clock = (v: unknown, fallback: string) => (typeof v === 'string' && /^\d\d:\d\d$/.test(v) ? v : fallback);
const minutes = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : fallback;
const text = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);

/** A part-filled commute — or whatever an older build stored — with every missing field replaced by its default. */
export function withDefaults(stored: unknown): Commute {
  const c = isObject(stored) ? stored : {};
  const contact = isObject(c.contact) ? c.contact : {};
  return {
    origin: place(c.origin, emptyCommute.origin),
    destination: place(c.destination, emptyCommute.destination),
    arriveBy: clock(c.arriveBy, emptyCommute.arriveBy),
    usualDeparture: clock(c.usualDeparture, emptyCommute.usualDeparture),
    bufferMin: minutes(c.bufferMin, emptyCommute.bufferMin),
    extraMin: minutes(c.extraMin, emptyCommute.extraMin),
    mode: c.mode === 'ride_hail' ? 'ride_hail' : 'drive',
    contact: {
      name: text(contact.name),
      phone: text(contact.phone),
      relationship: text(contact.relationship, emptyCommute.contact.relationship),
    },
  };
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
  const stored = await AsyncStorage.getItem(COMMUTE_KEY);
  if (stored === null) return seedCommute;
  try {
    return withDefaults(JSON.parse(stored));
  } catch {
    return seedCommute;
  }
}

/** Stores the commute and answers with what was stored: the phone number is normalised on the way in. */
export async function saveCommute(commute: Commute): Promise<Commute> {
  const saved: Commute = {
    ...withDefaults(commute),
    contact: { ...commute.contact, phone: normalisePhone(commute.contact.phone) },
  };
  await AsyncStorage.setItem(COMMUTE_KEY, JSON.stringify(saved));
  return saved;
}

/** The extra minutes mean parking to a driver and waiting for the car to a rider. */
export const extraMinLabel = (mode: Commute['mode']) => (mode === 'drive' ? 'Parking time' : 'Pickup wait');
