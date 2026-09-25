import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { theme } from '@/theme';
import { HeaderControls } from '@/today/HeaderControls';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const { color, size } = theme;
const props = { onRefresh: jest.fn(), onDemo: jest.fn(), demoOn: false };

const backdrops = () => screen.getAllByTestId('control-backdrop');
const blurs = () => screen.container.queryAll((n) => n.type === 'ViewManagerAdapter_ExpoBlur');

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

describe('HeaderControls on iOS', () => {
  it('floats each control on a dark blur, clipped to its round shape and under its icons', async () => {
    await render(<HeaderControls {...props} />);
    expect(backdrops()).toHaveLength(2); // the round edit button, and the pill holding Demo mode and refresh
    expect(blurs()).toHaveLength(2);
    for (const backdrop of backdrops()) {
      const blur = backdrop.queryAll((n) => n.type === 'ViewManagerAdapter_ExpoBlur')[0];
      expect(blur.props).toMatchObject({ tint: 'dark', intensity: 30 });
      expect(blur.props.blurMethod).toBe('none'); // no experimental blur method anywhere
      // Clipped to the circle, at the backdrop and at the blur itself.
      expect(backdrop).toHaveStyle({ borderRadius: size.roundButton / 2, overflow: 'hidden' });
      expect(blur.parent).toHaveStyle({ borderRadius: size.roundButton / 2, overflow: 'hidden' });
      // Under the buttons: the backdrop comes first in its control, and takes no touches.
      const control = backdrop.parent!;
      expect(control.children[0]).toHaveProp('testID', 'control-backdrop');
      expect(within(control).getAllByRole('button').length).toBeGreaterThan(0);
      expect(backdrop.props.pointerEvents).toBe('none');
    }
  });

  it('keeps the hairline border and drops the flat fill', async () => {
    await render(<HeaderControls {...props} />);
    for (const backdrop of backdrops()) {
      expect(backdrop).toHaveStyle({ borderWidth: 1, borderColor: color.border });
      expect(StyleSheet.flatten(backdrop.props.style).backgroundColor).toBeUndefined();
    }
  });
});

describe('HeaderControls on Android', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'android'));

  it('uses the flat fill instead of a blur', async () => {
    await render(<HeaderControls {...props} />);
    expect(blurs()).toHaveLength(0);
    for (const backdrop of backdrops())
      expect(backdrop).toHaveStyle({ backgroundColor: 'rgba(28,28,30,0.94)', borderWidth: 1, borderColor: color.border });
  });
});

describe('HeaderControls buttons', () => {
  const icon = (label: string) =>
    screen.getByRole('button', { name: label }).queryAll((n) => typeof n.props.stroke === 'string')[0];

  it('turns the Demo mode icon accent while Demo mode is on', async () => {
    const view = await render(<HeaderControls {...props} />);
    expect(icon('Demo mode').props.stroke).toBe(color.text);
    await view.rerender(<HeaderControls {...props} demoOn />);
    expect(icon('Demo mode, on').props.stroke).toBe(color.accent);
  });

  it('keeps every tap target at least 44 pt each way', async () => {
    await render(<HeaderControls {...props} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      const { width, height } = StyleSheet.flatten(button.props.style);
      expect(width).toBeGreaterThanOrEqual(44);
      expect(height).toBeGreaterThanOrEqual(44);
    }
  });

  it('does what each button says', async () => {
    await render(<HeaderControls {...props} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Edit commute' }));
    expect(router.push).toHaveBeenCalledWith('/setup');
    await fireEvent.press(screen.getByRole('button', { name: 'Demo mode' }));
    expect(props.onDemo).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Refresh routes' }));
    expect(props.onRefresh).toHaveBeenCalledTimes(1);
  });
});
