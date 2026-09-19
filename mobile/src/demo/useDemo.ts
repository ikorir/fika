import { useState } from 'react';

import type { Evaluation, Simulation } from '@/contract';
import { start } from '@/demo/presets';

type Demo = { start: Simulation; simulation: Simulation };

// Demo mode's state. In memory only: never persisted, so a restart of the app always comes back live.
export function useDemo() {
  const [demo, setDemo] = useState<Demo | null>(null); // null while Demo mode is off
  return {
    on: demo !== null,
    /** What the engine is given. Undefined while Demo mode is off, so nothing simulated can reach the screen. */
    simulation: demo?.simulation,
    /** `live` is the evaluation with nothing simulated, which is what the screen shows while Demo mode is off. */
    turnOn(live: Evaluation | undefined) {
      const first = live ? start(live) : {};
      setDemo({ start: first, simulation: first });
    },
    turnOff: () => setDemo(null),
    reset: () => setDemo((d) => d && { ...d, simulation: d.start }),
    change(next: (simulation: Simulation, start: Simulation) => Simulation) {
      setDemo((d) => d && { ...d, simulation: next(d.simulation, d.start) });
    },
  };
}

export type DemoMode = ReturnType<typeof useDemo>;
