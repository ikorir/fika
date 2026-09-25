import { useEffect, useState } from 'react';
import { AppState, Dimensions, PixelRatio } from 'react-native';

/**
 * How far the Today screen's body texts grow with the phone's text size before they stop: enough to read at the
 * largest sizes, not so much that a row breaks.
 */
export const LARGE_TEXT_CAP = 1.6;

/**
 * The phone's text scale, 1 at the standard size. It is read again when the app comes back to the front, which is
 * where the commuter returns from changing it in Settings, and whenever the phone reports a new one.
 */
export function useFontScale(): number {
  const [scale, setScale] = useState(() => PixelRatio.getFontScale());

  useEffect(() => {
    const read = () => setScale(PixelRatio.getFontScale());
    const woke = AppState.addEventListener('change', (state) => {
      if (state === 'active') read();
    });
    const resized = Dimensions.addEventListener('change', read);
    return () => {
      woke.remove();
      resized.remove();
    };
  }, []);

  return scale;
}
