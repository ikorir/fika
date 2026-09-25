import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { theme } from '@/theme';
import { CountdownRing } from '@/ui/CountdownRing';

// SVG drawn as host elements named after what they draw, carrying the props they were given, so a test can read the
// arc's animated props (react-native-svg's own elements keep only the props they draw with).
jest.mock('react-native-svg', () => {
  const React = require('react');
  const h = React.createElement;
  class Circle extends React.Component {
    setNativeProps() {} // what Reanimated calls on an SVG element; the animated props are read from the element
    render() {
      return h('Circle', this.props);
    }
  }
  const Svg = (props: object) => h('Svg', props);
  return { __esModule: true, default: Svg, Svg, Circle };
});

const { color, motion } = theme;
const all = { includeHiddenElements: true }; // the ring is decoration, hidden from assistive tech
const CIRCUMFERENCE = 2 * Math.PI * ((28 - 3) / 2);
/** How much of the ring's circumference is dashed away, leaving `fraction` of it drawn. */
const gone = (fraction: number) => ({ strokeDashoffset: CIRCUMFERENCE * (1 - fraction) });

let reduceMotion = false;
beforeEach(() => {
  reduceMotion = false;
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(() => Promise.resolve(reduceMotion));
  jest.useFakeTimers();
});
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('CountdownRing', () => {
  it('is a 28 pt ring: an accent arc, 3 pt wide, on a track in the control colour', async () => {
    await render(<CountdownRing fraction={0.5} />);
    const ring = screen.getByTestId('countdown-ring', all);
    expect([ring.props.width, ring.props.height]).toEqual([28, 28]);
    expect(ring.props.accessibilityElementsHidden).toBe(true);
    expect(screen.getByTestId('countdown-track', all).props).toEqual(
      expect.objectContaining({ stroke: color.control, strokeWidth: 3 }),
    );
    expect(screen.getByTestId('countdown-arc', all).props).toEqual(
      expect.objectContaining({ stroke: color.accent, strokeWidth: 3 }),
    );
  });

  it('draws the fraction of the window still to go', async () => {
    await render(<CountdownRing fraction={0.5} />);
    expect(screen.getByTestId('countdown-arc', all)).toHaveAnimatedProps(gone(0.5));
  });

  it('drains to a new fraction over time rather than jumping', async () => {
    const { rerender } = await render(<CountdownRing fraction={0.5} />);
    await rerender(<CountdownRing fraction={0.4} />);
    await act(() => jest.advanceTimersByTime(motion.duration.slow / 4));
    const arc = screen.getByTestId('countdown-arc', all);
    expect(arc).not.toHaveAnimatedProps(gone(0.4));
    expect(arc).not.toHaveAnimatedProps(gone(0.5));
    await act(() => jest.advanceTimersByTime(motion.duration.slow));
    expect(arc).toHaveAnimatedProps(gone(0.4));
  });

  it('with reduce motion, shows a new fraction at once', async () => {
    reduceMotion = true;
    const { rerender } = await render(<CountdownRing fraction={0.5} />);
    await act(() => Promise.resolve()); // the phone's answer to "reduce motion?"
    await rerender(<CountdownRing fraction={0.4} />);
    await act(() => jest.advanceTimersByTime(16));
    expect(screen.getByTestId('countdown-arc', all)).toHaveAnimatedProps(gone(0.4));
  });
});
