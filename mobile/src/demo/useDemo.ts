import { useState } from 'react';

import type { Evaluation, Simulation } from '@/contract';
import { startingPoint } from '@/demo/presets';

type Demo = { startingPoint: Simulation; simulation: Simulation };

// Demo mode's state. In memory only: never persisted, so a restart of the app always comes back live.
export function useDemo() {
  const [demo, setDemo] = useState<Demo | null>(null); // null while Demo mode is off
  return {
    on: demo !== null,
    /** What the engine is given. Undefined while Demo mode is off, so nothing simulated can reach the screen. */
    simulation: demo?.simulation,
    /** `live` is the evaluation with nothing simulated, which is what the screen shows while Demo mode is off. */
    turnOn(live: Evaluation | undefined) {
      const start = live ? startingPoint(live) : {};
      setDemo({ startingPoint: start, simulation: start });
    },
    turnOff: () => setDemo(null),
    reset: () => setDemo((d) => d && { ...d, simulation: d.startingPoint }),
    change(next: (simulation: Simulation, startingPoint: Simulation) => Simulation) {
      setDemo((d) => d && { ...d, simulation: next(d.simulation, d.startingPoint) });
    },
  };
}

export type DemoMode = ReturnType<typeof useDemo>;
