// The three setup sheets on the shared bottom sheet: each still does its job, and each close is reported once.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { fetchPlace, searchPlaces } from '@/api';
import type { Place } from '@/contract';
import { AddressSheet } from '@/setup/AddressSheet';
import { PickerSheet } from '@/setup/PickerSheet';
import { TimeSheet } from '@/setup/TimeSheet';
import { Press } from '@/ui/Press';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/api', () => ({ searchPlaces: jest.fn(), fetchPlace: jest.fn() }));

const westlands: Place = { placeId: 'w1', label: 'Westlands, Nairobi', location: { lat: -1.2676, lng: 36.8108 } };

// Opened the way the setup screen opens them: one flag, cleared by picking or by closing.
function Address({ onPick, onClose }: { onPick: (p: Place) => void; onClose: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <AddressSheet
      visible={open}
      title="From"
      onPick={(place) => {
        onPick(place);
        setOpen(false);
      }}
      onClose={() => {
        onClose();
        setOpen(false);
      }}
    />
  );
}

beforeEach(() => jest.clearAllMocks());

describe('AddressSheet', () => {
  it('searches in the sheet text field and picks a place without reporting a close', async () => {
    jest.useFakeTimers();
    jest.mocked(searchPlaces).mockResolvedValue({ suggestions: [{ placeId: 'w1', label: 'Westlands, Nairobi' }] });
    jest.mocked(fetchPlace).mockResolvedValue(westlands);
    const onPick = jest.fn();
    const onClose = jest.fn();
    await render(<Address onPick={onPick} onClose={onClose} />);

    const field = screen.getByLabelText('Search for From');
    expect(field).toBe(screen.getByTestId('sheet-text-input')); // so the keyboard lifts the sheet
    await fireEvent.changeText(field, 'Westlands');
    await act(() => jest.advanceTimersByTimeAsync(300));
    await fireEvent.press(await screen.findByRole('button', { name: 'Westlands, Nairobi' }));

    expect(onPick).toHaveBeenCalledWith(westlands);
    expect(screen.queryByLabelText('Search for From')).not.toBeOnTheScreen();
    expect(onClose).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('reports a close once and starts empty next time', async () => {
    const onClose = jest.fn();
    function Reopen() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <AddressSheet
            visible={open}
            title="To"
            onPick={() => {}}
            onClose={() => {
              onClose();
              setOpen(false);
            }}
          />
          {!open && <Press accessibilityRole="button" accessibilityLabel="Open To" onPress={() => setOpen(true)} />}
        </>
      );
    }
    await render(<Reopen />);
    await fireEvent.changeText(screen.getByLabelText('Search for To'), 'Kil');
    await fireEvent(screen.getByTestId('bottom-sheet'), 'dragClose');
    expect(onClose).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Open To' }));
    expect(screen.getByLabelText('Search for To')).toHaveDisplayValue('');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('PickerSheet', () => {
  const options = [0, 5, 10].map((value) => ({ value, label: `${value} min` }));

  it('picks a value, and the caller closing it is not reported back', async () => {
    const onPick = jest.fn();
    const onClose = jest.fn();
    function Buffer() {
      const [open, setOpen] = useState(true);
      return (
        <PickerSheet
          visible={open}
          title="Buffer"
          options={options}
          value={5}
          onPick={(v) => {
            onPick(v);
            setOpen(false);
          }}
          onClose={onClose}
        />
      );
    }
    await render(<Buffer />);
    expect(screen.getByRole('radio', { name: '5 min', checked: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: '10 min' }));
    expect(onPick).toHaveBeenCalledWith(10);
    expect(screen.queryByRole('radio', { name: '10 min' })).not.toBeOnTheScreen();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes once from the backdrop', async () => {
    const onClose = jest.fn();
    await render(<PickerSheet visible title="Buffer" options={options} value={5} onPick={() => {}} onClose={onClose} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Close Buffer' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('TimeSheet', () => {
  it('steps the hour and the minutes', async () => {
    const onChange = jest.fn();
    await render(<TimeSheet visible title="Arrive by" value="08:50" onChange={onChange} onClose={() => {}} />);
    expect(screen.getByLabelText('Arrive by 8:50')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Hour forward' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Minute back' }));
    expect(onChange.mock.calls).toEqual([['09:50'], ['08:45']]);
  });

  it('closes once when dragged down', async () => {
    const onClose = jest.fn();
    await render(<TimeSheet visible title="Arrive by" value="08:50" onChange={() => {}} onClose={onClose} />);
    await fireEvent(screen.getByTestId('bottom-sheet'), 'dragClose');
    expect(screen.queryByRole('button', { name: 'Hour forward' })).not.toBeOnTheScreen();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
