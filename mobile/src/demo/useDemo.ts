import { useState } from 'react';

import type { Evaluation, Simulation } from '@/contract';
import { startingPoint } from '@/demo/presets';

type Demo = { startingPoint: Simulation; simulation: Simulation };

// Demo mode's state. In memory only: never persisted, so a restart of the app always comes back live.
export function useDemo() {
  const [demo, setDemo] = useState<Demo | null>(null); // null while Demo mode is off
  const [saved, setSaved] = useState(false);

  const startFrom = (live: Evaluation | undefined) => {
    const start = live ? startingPoint(live) : {};
    setDemo({ startingPoint: start, simulation: start });
  };

  return {
    on: demo !== null,
    /** Whether the screen is running on the bundled response instead of a live fetch. */
    saved,
    /** What the engine is given. Undefined while Demo mode is off, so nothing simulated can reach the screen. */
    simulation: demo?.simulation,
    /** `live` is the evaluation with nothing simulated, which is what the screen shows while Demo mode is off. */
    turnOn: startFrom,
    turnOff() {
      setSaved(false); // back to live data, which is the only thing Demo mode being off can mean
      setDemo(null);
    },
    /**
     * Swap the data source. Every number changes underneath, so the demo starts again from the new ones — and it
     * starts, if it was not running: saved routes are real but not current, and only the banner Demo mode puts on
     * screen says so. `live` is the evaluation of the source being switched to, with nothing simulated.
     */
    runOnSaved(on: boolean, live: Evaluation | undefined) {
      setSaved(on);
      startFrom(live);
    },
    reset: () => setDemo((d) => d && { ...d, simulation: d.startingPoint }),
    change(next: (simulation: Simulation, startingPoint: Simulation) => Simulation) {
      setDemo((d) => d && { ...d, simulation: next(d.simulation, d.startingPoint) });
    },
  };
}

export type DemoMode = ReturnType<typeof useDemo>;
