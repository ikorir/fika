import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/** Whether the phone asks for less motion: the live setting, which follows the commuter changing it. */
export function useReduceMotion(): boolean {
  // Reanimated reads the setting once at start-up, so the first frame is already right; the phone's answer follows.
  const atStart = useReducedMotion();
  const [reduce, setReduce] = useState(atStart);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then(
      (on) => {
        if (live) setReduce(on);
      },
      () => {},
    );
    const changed = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      live = false;
      changed.remove();
    };
  }, []);

  return reduce;
}
