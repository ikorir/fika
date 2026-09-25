import { act, renderHook } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import type { Evaluation } from '@/contract';
import { reminderSet, select, sent, stateChanged, stateHaptic, useStateHaptic } from '@/ui/haptics';

const impact = jest.mocked(Haptics.impactAsync);
const notification = jest.mocked(Haptics.notificationAsync);
const { Light, Medium } = Haptics.ImpactFeedbackStyle;
const { Success, Warning, Error: Failure } = Haptics.NotificationFeedbackType;

type State = Evaluation['state'];

beforeEach(() => jest.clearAllMocks());

describe('stateHaptic', () => {
  const pairs: [State, State, ReturnType<typeof stateHaptic>][] = [
    ['on_time', 'on_time', null],
    ['on_time', 'at_risk', 'warning'],
    ['on_time', 'late', 'error'],
    ['at_risk', 'on_time', null],
    ['at_risk', 'at_risk', null],
    ['at_risk', 'late', 'error'],
    ['late', 'on_time', null],
    ['late', 'at_risk', 'warning'],
    ['late', 'late', null],
  ];
  it.each(pairs)('%s to %s gives %s', (from, to, haptic) => {
    expect(stateHaptic(from, to)).toBe(haptic);
  });

  it.each<State>(['on_time', 'at_risk', 'late'])('gives nothing for the first state of a launch (%s)', (to) => {
    expect(stateHaptic(undefined, to)).toBeNull();
  });
});

describe('stateChanged', () => {
  it('buzzes a warning when the commute becomes at risk', () => {
    stateChanged('on_time', 'at_risk');
    expect(notification).toHaveBeenCalledWith(Warning);
  });

  it('buzzes an error when the commute becomes late', () => {
    stateChanged('at_risk', 'late');
    expect(notification).toHaveBeenCalledWith(Failure);
  });

  it('stays still back on time, and on the first state of a launch', () => {
    stateChanged('late', 'on_time');
    stateChanged(undefined, 'late');
    expect(notification).not.toHaveBeenCalled();
    expect(impact).not.toHaveBeenCalled();
  });
});

describe('one haptic per moment', () => {
  it('select is a light impact', () => {
    select();
    expect(impact).toHaveBeenCalledWith(Light);
  });

  it('reminderSet is a success notification', () => {
    reminderSet();
    expect(notification).toHaveBeenCalledWith(Success);
  });

  it('sent is a medium impact', () => {
    sent();
    expect(impact).toHaveBeenCalledWith(Medium);
  });
});

describe('haptics never throw', () => {
  it('swallows a native call that throws', () => {
    impact.mockImplementationOnce(() => {
      throw new Error('no haptic engine');
    });
    notification.mockImplementationOnce(() => {
      throw new Error('no haptic engine');
    });
    expect(() => select()).not.toThrow();
    expect(() => stateChanged('on_time', 'late')).not.toThrow();
  });

  it('swallows a native call that rejects', async () => {
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    impact.mockImplementationOnce(() => Promise.reject(new Error('unavailable')));
    notification.mockImplementationOnce(() => Promise.reject(new Error('unavailable')));
    expect(() => sent()).not.toThrow();
    expect(() => reminderSet()).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});

describe('useStateHaptic', () => {
  it('buzzes on each change of state after the first, and not for a gap while routes reload', async () => {
    const { rerender } = await renderHook((state: State | undefined) => useStateHaptic(state), {
      initialProps: undefined as State | undefined,
    });
    await act(() => rerender('on_time')); // first evaluation of the launch
    expect(notification).not.toHaveBeenCalled();

    await act(() => rerender('at_risk'));
    expect(notification).toHaveBeenLastCalledWith(Warning);

    await act(() => rerender(undefined)); // no evaluation for a moment
    await act(() => rerender('at_risk'));
    expect(notification).toHaveBeenCalledTimes(1);

    await act(() => rerender('late'));
    expect(notification).toHaveBeenLastCalledWith(Failure);

    await act(() => rerender('on_time'));
    expect(notification).toHaveBeenCalledTimes(2);
  });
});
