import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { savedCommute, savedRoutes, scriptSteps } from '@/demo/saved';
import { departureWindow } from '@/engine/window';
import { theme } from '@/theme';
import { DepartureWindow } from '@/today/DepartureWindow';

const { color } = theme;
const steps = scriptSteps(savedCommute, savedRoutes.samples, new Date('2026-09-20T22:00:00+03:00'));
const onTime = steps.find((s) => s.scenario === 'on_time')!;
// 7:15, 7:30 and 7:50 (chosen) early, 8:00 tight, 8:15 late.
const blocks = departureWindow(savedRoutes.samples, savedCommute, onTime.evaluation, onTime.simulation);

const block = (time: string) => screen.getByRole('button', { name: new RegExp(`^Leave ${time}`) });

describe('DepartureWindow', () => {
  it('shows every departure Fika checked, by its time', async () => {
    await render(<DepartureWindow blocks={blocks} />);
    for (const time of ['7:15', '7:30', '7:50', '8:00', '8:15']) expect(screen.getByText(time)).toBeOnTheScreen();
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('colours each block by how it arrives, in the state tint and colour', async () => {
    await render(<DepartureWindow blocks={blocks} />);
    expect(block('7:30')).toHaveStyle({ backgroundColor: color.onTimeTint });
    expect(screen.getByText('7:30')).toHaveStyle({ color: color.onTime });
    expect(block('8:00')).toHaveStyle({ backgroundColor: color.atRiskTint });
    expect(screen.getByText('8:00')).toHaveStyle({ color: color.atRisk });
    expect(block('8:15')).toHaveStyle({ backgroundColor: color.lateTint });
    expect(screen.getByText('8:15')).toHaveStyle({ color: color.late });
  });

  it('raises the chosen departure: taller, with a border in its colour', async () => {
    await render(<DepartureWindow blocks={blocks} />);
    const chosen = block('7:50');
    const other = block('7:30');
    expect(chosen).toBeSelected();
    expect(other).not.toBeSelected();
    expect(chosen).toHaveStyle({ borderColor: color.onTime });
    expect(other).toHaveStyle({ borderColor: color.hairline });
    const height = (el: typeof chosen) => StyleSheet.flatten(el.props.style).height as number;
    expect(height(chosen)).toBeGreaterThan(height(other));
  });

  it('shows one line for a tapped block, and hides it on a second tap', async () => {
    await render(<DepartureWindow blocks={blocks} />);
    const line = 'Leave 8:00 · arrive 8:58 via Limuru Road';
    expect(screen.queryByText(line)).not.toBeOnTheScreen();

    await fireEvent.press(block('8:00'));
    expect(screen.getByText(line)).toBeOnTheScreen();

    await fireEvent.press(block('7:15'));
    expect(screen.queryByText(line)).not.toBeOnTheScreen();
    expect(screen.getByText('Leave 7:15 · arrive 8:13 via Limuru Road')).toBeOnTheScreen();

    await fireEvent.press(block('7:15'));
    expect(screen.queryByText(/^Leave 7:15 · arrive/)).not.toBeOnTheScreen();
  });
});
