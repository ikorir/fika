// The Today screen as a whole, with its data and everything native stubbed out. It lives here and not beside the
// screen because Expo Router would take any file in `app/` for a route.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { RoutesResponse } from '@/contract';
import TodayScreen from '@/app/index';
import { savedRoutes } from '@/demo/saved';
import { theme } from '@/theme';
import { useRoutes } from '@/today/useRoutes';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() } }));
jest.mock('@/today/MapArea', () => ({ MapArea: () => null }));
jest.mock('@/today/useRoutes', () => ({ useRoutes: jest.fn() }));
jest.mock('@/draft/useDraft', () => ({ useDraft: () => ({ words: null, loading: false }) }));
jest.mock('@/reminders/useReminders', () => ({
  useDailyReminder: jest.fn(),
  useRefreshOnWake: jest.fn(),
  useDemoReminderCue: jest.fn(),
  useOneOffReminder: (at: string | null) => ({ at, set: false, toggle: jest.fn() }),
}));
jest.mock('@/useCommute', () => ({ useCommute: () => ({ commute: require('@/seed').seedCommute, save: jest.fn() }) }));

const { color } = theme;
const MIN = 60_000;
// Inside the saved routes' morning in Nairobi, so the engine has a real evaluation to show.
const NOW = new Date('2026-09-21T07:20:00+03:00');

type Routes = ReturnType<typeof useRoutes>;
const refresh = jest.fn(() => Promise.resolve());
const routes = (over: Partial<Routes>) =>
  jest.mocked(useRoutes).mockReturnValue({ data: null, error: null, loading: false, refresh, ...over });

const fetchedAgo = (ms: number): RoutesResponse => ({ ...savedRoutes, fetchedAt: new Date(NOW.getTime() - ms).toISOString() });
const noRoutes: RoutesResponse = { ...fetchedAgo(0), samples: savedRoutes.samples.map((s) => ({ ...s, routes: [] })) };

const scrollView = () => screen.container.queryAll((n) => n.props.refreshControl !== undefined)[0];

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('Today, when there is nothing to show', () => {
  it('says there is no driving route between the two places, and offers to edit the commute', async () => {
    routes({ data: noRoutes });
    await render(<TodayScreen />);
    expect(screen.getByRole('header', { name: 'No driving route' })).toBeOnTheScreen();
    expect(screen.getByText(/from Ruaka to Upper Hill/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Edit commute' }));
    expect(router.push).toHaveBeenCalledWith('/setup');
  });

  it('says it couldn’t get routes, with the error as the reason, and tries again', async () => {
    routes({ error: 'Network request failed' });
    await render(<TodayScreen />);
    expect(screen.getByRole('header', { name: 'Couldn’t get routes' })).toBeOnTheScreen();
    expect(screen.getByText('Network request failed')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps the last numbers and the line that says so when a refresh fails', async () => {
    routes({ data: fetchedAgo(0), error: 'Network request failed' });
    await render(<TodayScreen />);
    expect(
      screen.getByText('Couldn’t refresh — these are the numbers Fika last got. Network request failed'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('empty-state')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe('Today, pull to refresh', () => {
  it('pulls to refresh in the accent colour, and spins while fresh numbers are on their way over shown ones', async () => {
    routes({ data: fetchedAgo(0), loading: true });
    await render(<TodayScreen />);
    const control = scrollView().props.refreshControl;
    expect(control.props.tintColor).toBe(color.accent);
    expect(control.props.colors).toEqual([color.accent]);
    expect(control.props.refreshing).toBe(true);
    control.props.onRefresh();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not spin over the first load, which shows placeholders instead, nor at rest', async () => {
    routes({ loading: true });
    const { rerender } = await render(<TodayScreen />);
    expect(scrollView().props.refreshControl.props.refreshing).toBe(false);
    routes({ data: fetchedAgo(0) });
    await rerender(<TodayScreen />);
    expect(scrollView().props.refreshControl.props.refreshing).toBe(false);
  });
});

describe('Today, how fresh the numbers are', () => {
  it('ages the label on the real clock, with no fetch, and turns its dot amber once the numbers are stale', async () => {
    routes({ data: fetchedAgo(9 * MIN + 45_000) });
    await render(<TodayScreen />);
    expect(screen.getByText('Updated 7:10')).toBeOnTheScreen();
    expect(screen.getByTestId('freshness-dot')).toHaveStyle({ backgroundColor: color.onTime });

    await act(() => jest.advanceTimersByTime(30_000));
    expect(screen.getByText('Updated 7:10 · 10 min old')).toBeOnTheScreen();
    expect(screen.getByTestId('freshness-dot')).toHaveStyle({ backgroundColor: color.atRisk });
    expect(refresh).not.toHaveBeenCalled();
  });
});
