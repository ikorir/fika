import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { DemoSheet } from '@/demo/DemoSheet';
import { savedCommute, savedRoutes, scriptSteps } from '@/demo/saved';
import type { DemoMode } from '@/demo/useDemo';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const evaluation = scriptSteps(savedCommute, savedRoutes.samples, new Date('2026-09-20T22:00:00+03:00'))[0].evaluation;
const demo: DemoMode = {
  on: true,
  saved: true,
  simulation: {},
  turnOn: jest.fn(),
  turnOff: jest.fn(),
  runOnSaved: jest.fn(),
  reset: jest.fn(),
  change: jest.fn(),
};

const renderSheet = () =>
  render(
    <DemoSheet
      visible
      onClose={() => {}}
      demo={demo}
      commute={savedCommute}
      samples={savedRoutes.samples}
      evaluation={evaluation}
      onRestart={() => {}}
      onSaved={() => {}}
    />,
  );

beforeEach(() => jest.clearAllMocks());

describe('DemoSheet haptics', () => {
  it('gives a light tap when a scenario is picked', async () => {
    await renderSheet();
    for (const scenario of screen.getAllByRole('checkbox')) await fireEvent.press(scenario);
    expect(demo.change).toHaveBeenCalledTimes(2);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('keeps the clock steps silent', async () => {
    await renderSheet();
    await fireEvent.press(screen.getByRole('button', { name: 'Back 5 minutes' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Forward 5 minutes' }));
    expect(demo.change).toHaveBeenCalledTimes(2);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
});
