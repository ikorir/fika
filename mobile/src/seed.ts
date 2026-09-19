import type { Commute } from '@/contract';

// A stand-in Nairobi commute (the repository is public, so not the presenter's real one).
// Hardcoded until the setup screen (#10) stores a commute; it then seeds that screen.
export const seedCommute: Commute = {
  origin: { placeId: '', label: 'Kangemi', location: { lat: -1.264, lng: 36.747 } },
  destination: { placeId: '', label: 'Upper Hill', location: { lat: -1.2985, lng: 36.8155 } },
  arriveBy: '09:00',
  usualDeparture: '08:20',
  bufferMin: 10,
  extraMin: 5,
  mode: 'drive',
  contact: { name: 'Mary', phone: '254700000000', relationship: 'manager' },
};
