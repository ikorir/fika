import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { savedCommute, savedRoutes, scriptSteps } from '@/demo/saved';
import { PrimaryAction } from '@/today/PrimaryAction';

const steps = scriptSteps(savedCommute, savedRoutes.samples, new Date('2026-09-20T22:00:00+03:00'));
const onTime = steps.find((s) => s.evaluation.state === 'on_time')!.evaluation;
const late = steps.find((s) => s.evaluation.state === 'late' && !s.evaluation.betterRouteId)!.evaluation;
const reminder = { at: null, set: false, toggle: () => {} };

describe('PrimaryAction at large text sizes', () => {
  it('keeps its label on one line, shrinking it to 80% before it cuts', async () => {
    await render(<PrimaryAction evaluation={late} reminder={reminder} onSelectRoute={() => {}} onReviewNotice={() => {}} />);
    const label = screen.getByText('Review and send notice');
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.adjustsFontSizeToFit).toBe(true);
    expect(label.props.minimumFontScale).toBe(0.8);
  });
});

describe('PrimaryAction with reminders turned off', () => {
  const blocked = { at: onTime.remindAt, set: false, blocked: true, toggle: () => {} };

  it('says reminders are off in a card, with a way to the phone’s settings, in place of "Remind me"', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await render(<PrimaryAction evaluation={onTime} reminder={blocked} onSelectRoute={() => {}} onReviewNotice={() => {}} />);
    expect(screen.getByTestId('empty-state')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Reminders are off' })).toBeOnTheScreen();
    expect(screen.getByText(/Turn on notifications for Fika/)).toBeOnTheScreen();
    expect(screen.queryByText(/^Remind me at/)).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Open settings' }));
    expect(openSettings).toHaveBeenCalledTimes(1);
    openSettings.mockRestore();
  });

  it('offers "Remind me" as before while notifications are not known to be off', async () => {
    await render(
      <PrimaryAction evaluation={onTime} reminder={{ ...blocked, blocked: false }} onSelectRoute={() => {}} onReviewNotice={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /^Remind me at / })).toBeOnTheScreen();
    expect(screen.queryByTestId('empty-state')).not.toBeOnTheScreen();
  });
});
