// The setup screen itself. It lives here and not beside the screen because Expo Router would take any file in `app/`
// for a route.
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import SetupScreen from '@/app/setup';
import type { Commute } from '@/contract';
import { seedCommute } from '@/seed';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) } }));
jest.mock('@/api', () => ({ searchPlaces: jest.fn(), fetchPlace: jest.fn() }));
const mockSave = jest.fn(async (_: Commute) => {});
let mockCommute: Commute = seedCommute;
jest.mock('@/useCommute', () => ({ useCommute: () => ({ commute: mockCommute, save: mockSave }) }));

beforeEach(() => {
  mockCommute = seedCommute;
  jest.clearAllMocks();
});

const saved = () => mockSave.mock.calls[0][0];
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

describe('SetupScreen', () => {
  it('lets a tap land on the first try while the keyboard is up', async () => {
    await render(<SetupScreen />);
    const scrolls = screen.container.queryAll((n) => n.type === 'RCTScrollView');
    expect(scrolls.length).toBeGreaterThan(0);
    for (const scroll of scrolls) expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
  });
});

describe('Setup, quiet weekends', () => {
  it('is a switch, on by default, saved with the rest', async () => {
    await render(<SetupScreen />);
    const quiet = screen.getByRole('switch', { name: 'Quiet on weekends' });
    expect(quiet.props.value).toBe(true);

    await fireEvent(quiet, 'valueChange', false);
    await press('Save commute');

    expect(saved()).toEqual({ ...seedCommute, quietWeekends: false });
  });

  it('shows the stored value, and turns back on', async () => {
    mockCommute = { ...seedCommute, quietWeekends: false };
    await render(<SetupScreen />);
    const quiet = screen.getByRole('switch', { name: 'Quiet on weekends' });
    expect(quiet.props.value).toBe(false);
    await fireEvent(quiet, 'valueChange', true);
    await press('Save commute');
    expect(saved().quietWeekends).toBe(true);
  });
});

describe('Setup, a different time on some days', () => {
  it('lists Monday to Sunday, each on the usual time until it is given its own', async () => {
    await render(<SetupScreen />);
    expect(screen.getByRole('button', { name: 'Different time on some days: None' })).toBeOnTheScreen();
    await press(/^Different time on some days/);

    expect(screen.getByRole('header', { name: 'Different time on some days' })).toBeOnTheScreen();
    const days = screen.getAllByRole('button', { name: /day: usual time, 9:00$/ }).map((b) => b.props.accessibilityLabel);
    expect(days).toEqual(
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => `${d}: usual time, 9:00`),
    );
  });

  it('sets Friday to 8:30 and saves it with the rest', async () => {
    await render(<SetupScreen />);
    await press(/^Different time on some days/);
    await press('Friday: usual time, 9:00');

    // Friday's time starts from the usual arrive-by.
    expect(screen.getByRole('header', { name: 'Arrive by on Friday' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Arrive by on Friday 9:00')).toBeOnTheScreen();
    await press('Hour back');
    for (let i = 0; i < 6; i++) await press('Minute forward');
    expect(screen.getByLabelText('Arrive by on Friday 8:30')).toBeOnTheScreen();

    // Closing the time goes back to the week, with Friday on its own time.
    await press('Close');
    expect(screen.getByRole('button', { name: 'Friday: 8:30' })).toBeOnTheScreen();
    await press('Close');
    expect(screen.getByRole('button', { name: 'Different time on some days: Fri 8:30' })).toBeOnTheScreen();

    await press('Save commute');
    expect(saved()).toEqual({ ...seedCommute, arriveByByDay: { fri: '08:30' } });
  });

  it('leaves a day on the usual time when its time is opened and closed untouched', async () => {
    await render(<SetupScreen />);
    await press(/^Different time on some days/);
    await press('Tuesday: usual time, 9:00');
    await press('Close');
    expect(screen.getByRole('button', { name: 'Tuesday: usual time, 9:00' })).toBeOnTheScreen();
    await press('Close');
    await press('Save commute');
    expect(saved()).toEqual(seedCommute);
    expect(saved()).not.toHaveProperty('arriveByByDay');
  });

  it('puts a day back on the usual time', async () => {
    mockCommute = { ...seedCommute, arriveByByDay: { fri: '08:30', mon: '10:00' } };
    await render(<SetupScreen />);
    expect(screen.getByRole('button', { name: 'Different time on some days: 2 days' })).toBeOnTheScreen();
    await press(/^Different time on some days/);
    await press('Use the usual time on Friday');
    expect(screen.getByRole('button', { name: 'Friday: usual time, 9:00' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Monday: 10:00' })).toBeOnTheScreen();
    await press('Close');
    await press('Save commute');
    expect(saved().arriveByByDay).toEqual({ mon: '10:00' });
  });
});

describe('Setup, what stays as it was', () => {
  it('still asks for a name before it saves', async () => {
    await render(<SetupScreen />);
    await fireEvent.changeText(screen.getByLabelText('Name'), '  ');
    await press('Save commute');
    expect(screen.getByText('Add a name.')).toBeOnTheScreen();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('saves the fields that were there before, unchanged', async () => {
    await render(<SetupScreen />);
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Otieno');
    await fireEvent.changeText(screen.getByLabelText('Phone'), '0712 345 678');
    await press('Save commute');
    expect(saved()).toEqual({ ...seedCommute, contact: { ...seedCommute.contact, name: 'Otieno', phone: '0712 345 678' } });
  });

  it('ends with the footnote', async () => {
    await render(<SetupScreen />);
    const texts = screen.container.queryAll((n) => n.type === 'Text').map((n) => [n.props.children].flat().join(''));
    expect(texts.at(-1)).toBe('Saved on this phone only. No account needed.');
    expect(within(screen.container).getByText('Quiet on weekends')).toBeOnTheScreen();
  });
});
