import type { Commute } from '@/contract';
import { seedCommute } from '@/seed';

// The saved commute. The seeded one until the setup screen (#10) stores one in AsyncStorage.
export function useCommute(): Commute {
  return seedCommute;
}
