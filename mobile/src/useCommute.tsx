import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { loadCommute, saveCommute } from '@/commute';
import type { Commute } from '@/contract';

/** The commute both screens work from, and the way to store a new one. */
export type CommuteStore = { commute: Commute; save: (next: Commute) => Promise<void> };

const CommuteContext = createContext<CommuteStore | null>(null);

/** Reads the saved commute once. Null until the phone has answered, so the splash screen can stay up. */
export function useSavedCommute(): CommuteStore | null {
  const [commute, setCommute] = useState<Commute | null>(null);

  useEffect(() => {
    loadCommute().then(setCommute);
  }, []);

  // A new object every save, so the Today screen fetches routes for the commute that was just edited.
  const save = useCallback(async (next: Commute) => {
    setCommute(await saveCommute(next));
  }, []);

  return commute && { commute, save };
}

export function CommuteProvider({ store, children }: { store: CommuteStore; children: ReactNode }) {
  return <CommuteContext.Provider value={store}>{children}</CommuteContext.Provider>;
}

export function useCommute(): CommuteStore {
  const store = useContext(CommuteContext);
  if (!store) throw new Error('useCommute needs a CommuteProvider above it.');
  return store;
}
