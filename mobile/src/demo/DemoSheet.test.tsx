import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';

import { DemoSheet } from '@/demo/DemoSheet';
import { savedCommute, savedRoutes, scriptSteps } from '@/demo/saved';
import type { DemoMode } from '@/demo/useDemo';
import { NoticeSheet } from '@/notice/NoticeSheet';
import { Press } from '@/ui/Press';

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

const renderSheet = (props: Partial<React.ComponentProps<typeof DemoSheet>> = {}) =>
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
      {...props}
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

describe('DemoSheet on the shared bottom sheet', () => {
  it('shows nothing while hidden', async () => {
    await renderSheet({ visible: false });
    expect(screen.queryByText('Scenarios')).not.toBeOnTheScreen();
  });

  it('keeps the Demo mode switch, saved routes switch and reset working', async () => {
    const onSaved = jest.fn();
    const onRestart = jest.fn();
    await renderSheet({ onSaved, onRestart });
    expect(screen.getByRole('header', { name: 'Demo mode' })).toBeOnTheScreen();

    await fireEvent(screen.getByRole('switch', { name: 'Use saved routes' }), 'valueChange', false);
    expect(onSaved).toHaveBeenCalledWith(false);

    await fireEvent.press(screen.getByRole('button', { name: 'Reset to start' }));
    expect(demo.reset).toHaveBeenCalledTimes(1);
    expect(onRestart).toHaveBeenCalledTimes(1);

    await fireEvent(screen.getByRole('switch', { name: 'Demo mode' }), 'valueChange', false);
    expect(demo.turnOff).toHaveBeenCalledTimes(1);
    expect(onRestart).toHaveBeenCalledTimes(2);
  });

  it('closes once when dragged down', async () => {
    const onClose = jest.fn();
    await renderSheet({ onClose });
    await fireEvent(screen.getByTestId('bottom-sheet'), 'dragClose');
    expect(screen.queryByText('Scenarios')).not.toBeOnTheScreen();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // The two sheets open from different surfaces, so one is always closed before the other opens.
  it('opens after the notice sheet has closed, and the notice opens again after it', async () => {
    const notice = { eta: '9:15', lateMin: 15, text: 'About 15 minutes late.' };
    function Today() {
      const [open, setOpen] = useState<'notice' | 'demo' | null>('notice');
      return (
        <>
          <NoticeSheet
            visible={open === 'notice'}
            notice={notice}
            contact={savedCommute.contact}
            voice={{ tone: 'manager', language: 'en' }}
            onTone={() => {}}
            onLanguage={() => {}}
            onEdit={() => {}}
            onClose={() => setOpen(null)}
          />
          <DemoSheet
            visible={open === 'demo'}
            onClose={() => setOpen(null)}
            demo={demo}
            commute={savedCommute}
            samples={savedRoutes.samples}
            evaluation={evaluation}
            onRestart={() => {}}
            onSaved={() => {}}
          />
          <Press accessibilityRole="button" accessibilityLabel="Open Demo mode" onPress={() => setOpen('demo')} />
          <Press accessibilityRole="button" accessibilityLabel="Review and send notice" onPress={() => setOpen('notice')} />
        </>
      );
    }
    await render(<Today />);
    expect(screen.getByLabelText('Message')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Open Demo mode' }));
    expect(screen.getByText('Scenarios')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Message')).not.toBeOnTheScreen();

    await fireEvent(screen.getByTestId('bottom-sheet'), 'dragClose');
    await fireEvent.press(screen.getByRole('button', { name: 'Review and send notice' }));
    expect(screen.getByLabelText('Message')).toBeOnTheScreen();
    expect(screen.queryByText('Scenarios')).not.toBeOnTheScreen();
  });
});
