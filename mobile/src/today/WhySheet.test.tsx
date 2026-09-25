import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { savedCommute, savedRoutes, scriptSteps, type Step } from '@/demo/saved';
import { explain } from '@/engine/explain';
import { theme } from '@/theme';
import { WhySheet } from '@/today/WhySheet';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const { color } = theme;
const steps = scriptSteps(savedCommute, savedRoutes.samples, new Date('2026-09-20T22:00:00+03:00'));
const step = (scenario: Step['scenario']) => steps.find((s) => s.scenario === scenario)!;

async function show(scenario: Step['scenario'], onClose = jest.fn()) {
  const { evaluation, simulation } = step(scenario);
  const explanation = explain(evaluation, savedCommute, savedRoutes.samples, simulation);
  await render(<WhySheet visible evaluation={evaluation} explanation={explanation} onClose={onClose} />);
}

const rowAt = (time: string) => screen.getAllByTestId('why-row').find((r) => within(r).queryByText(time))!;

describe('WhySheet', () => {
  it('is titled with the leave-by and states the rule in one line', async () => {
    await show('on_time');
    expect(screen.getByRole('header', { name: 'Why leave by 7:50' })).toBeOnTheScreen();
    expect(screen.getByText('Arrive by 9:00, minus 10 min buffer and 10 min parking')).toBeOnTheScreen();
  });

  it('lists every departure checked, with its arrival coloured by how it stands', async () => {
    await show('on_time');
    const rows = screen.getAllByTestId('why-row');
    expect(rows).toHaveLength(5);
    for (const [time, arrive, kind] of [
      ['7:15', '8:13', color.onTime],
      ['7:30', '8:29', color.onTime],
      ['7:50', '8:49', color.onTime],
      ['8:00', '8:58', color.atRisk],
      ['8:15', '9:13', color.late],
    ]) {
      expect(within(rowAt(time)).getByText(`arrive ${arrive}`)).toHaveStyle({ color: kind });
      expect(within(rowAt(time)).getByText('via Limuru Road')).toBeOnTheScreen();
    }
  });

  it('marks the one Fika chose', async () => {
    await show('on_time');
    expect(screen.getAllByText('Chosen')).toHaveLength(1);
    expect(within(rowAt('7:50')).getByText('Chosen')).toBeOnTheScreen();
  });

  it('ends with the reason', async () => {
    await show('on_time');
    expect(
      screen.getByText('7:50 is the latest time Fika checked that still gets you there by 8:50, before your buffer.'),
    ).toBeOnTheScreen();
  });

  it('works at risk and late too', async () => {
    await show('at_risk');
    expect(screen.getByRole('header', { name: 'Why leave now' })).toBeOnTheScreen();
    expect(within(rowAt('7:30')).getByText('Chosen')).toBeOnTheScreen();
    expect(within(rowAt('7:50')).getByText('arrive 8:53')).toHaveStyle({ color: color.atRisk });
  });

  it('closes', async () => {
    const onClose = jest.fn();
    await show('late', onClose);
    expect(screen.getByText(/^You left at 7:50/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
