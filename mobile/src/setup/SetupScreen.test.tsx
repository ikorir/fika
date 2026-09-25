// The setup screen itself. It lives here and not beside the screen because Expo Router would take any file in `app/`
// for a route.
import { render, screen } from '@testing-library/react-native';

import SetupScreen from '@/app/setup';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) } }));
jest.mock('@/api', () => ({ searchPlaces: jest.fn(), fetchPlace: jest.fn() }));
jest.mock('@/useCommute', () => ({ useCommute: () => ({ commute: require('@/seed').seedCommute, save: jest.fn() }) }));

describe('SetupScreen', () => {
  it('lets a tap land on the first try while the keyboard is up', async () => {
    await render(<SetupScreen />);
    const scrolls = screen.container.queryAll((n) => n.type === 'RCTScrollView');
    expect(scrolls.length).toBeGreaterThan(0);
    for (const scroll of scrolls) expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
  });
});
