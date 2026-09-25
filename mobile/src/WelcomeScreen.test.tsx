// The first-run screen. It lives here and not beside the screen because Expo Router would take any file in `app/`
// for a route.
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccessibilityInfo } from 'react-native';

import WelcomeScreen from '@/app/welcome';
import { WelcomedContext } from '@/store/welcomed';
import { theme } from '@/theme';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));

const { color, motion } = theme;
let reduceMotion = false;
const welcomed = jest.fn();

const renderWelcome = () =>
  render(
    <WelcomedContext.Provider value={welcomed}>
      <WelcomeScreen />
    </WelcomedContext.Provider>,
  );

beforeEach(() => {
  reduceMotion = false;
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(() => Promise.resolve(reduceMotion));
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('WelcomeScreen', () => {
  it('says what Fika does in one line', async () => {
    await renderWelcome();
    expect(screen.getByRole('header', { name: 'Know when to leave.' })).toBeOnTheScreen();
    expect(
      screen.getByText('Fika checks the roads, tells you when to go, and writes the message if you’ll be late.'),
    ).toBeOnTheScreen();
  });

  it('shows the icon glyph, fading and rising in with the shared enter preset', async () => {
    await renderWelcome();
    const glyph = screen.getByTestId('welcome-glyph');
    expect(glyph.props.entering?.getDuration()).toBe(motion.duration.base);
    expect(glyph.queryAll((n) => typeof n.props.d === 'string')).toHaveLength(3); // the ring, the hand and the road
  });

  it('shows the glyph at once with reduce motion on', async () => {
    reduceMotion = true;
    await renderWelcome();
    expect(screen.getByTestId('welcome-glyph').props.entering).toBeUndefined();
  });

  it('sets up the commute from the primary button, and leaves the welcome for good', async () => {
    await renderWelcome();
    const setUp = screen.getByRole('button', { name: 'Set up my commute' });
    expect(setUp).toHaveStyle({ backgroundColor: color.accent, height: theme.size.button, borderRadius: theme.radius.pill });
    await fireEvent.press(setUp);
    expect(welcomed).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/setup');
  });

  it('goes to Today on the sample commute from the text button, and leaves the welcome for good', async () => {
    await renderWelcome();
    await fireEvent.press(screen.getByRole('button', { name: 'Try it with a sample commute' }));
    expect(welcomed).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled(); // the layout swaps the welcome for Today itself
  });

  it('is on the dark theme, in Figtree', async () => {
    await renderWelcome();
    expect(screen.getByTestId('welcome')).toHaveStyle({ backgroundColor: color.bg });
    expect(screen.getByText('Know when to leave.')).toHaveStyle({ fontFamily: theme.font.extrabold, color: color.text });
  });
});
