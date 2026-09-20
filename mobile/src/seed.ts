import type { Commute } from '@/contract';

// A stand-in Nairobi commute (the repository is public, so not the presenter's real one).
// Hardcoded until the setup screen (#10) stores a commute; it then seeds that screen.
export const seedCommute: Commute = {
  origin: { placeId: '', label: 'Ruaka', location: { lat: -1.201, lng: 36.772 } },
  destination: { placeId: '', label: 'Upper Hill', location: { lat: -1.2985, lng: 36.8155 } },
  arriveBy: '09:00',
  usualDeparture: '07:50',
  bufferMin: 10,
  extraMin: 10,
  mode: 'drive',
  contact: { name: 'Mary', phone: '254700000000', relationship: 'manager' },
};
