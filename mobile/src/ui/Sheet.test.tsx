import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { BackHandler, Dimensions, Text } from 'react-native';

import { theme } from '@/theme';
import { Sheet, SheetTextInput } from '@/ui/Sheet';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const { color } = theme;

const sheet = (visible: boolean, onClose: () => void, extra: { footer?: React.ReactNode; header?: React.ReactNode } = {}) => (
  <Sheet visible={visible} title="Arrive by" onClose={onClose} {...extra}>
    <Text>8:50 AM</Text>
  </Sheet>
);

// Android's back button: the handler the sheet registered, pressed as the OS would.
let pressBack: (() => boolean | null | undefined) | undefined;
beforeEach(() => {
  pressBack = undefined;
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    const press = () => handler({ type: 'hardwareBackPress', timeStamp: Date.now() });
    pressBack = press;
    return {
      remove: () => {
        if (pressBack === press) pressBack = undefined;
      },
    };
  });
});
afterEach(() => jest.restoreAllMocks());

describe('Sheet', () => {
  it('shows its title, close button and children while visible', async () => {
    await render(sheet(true, () => {}));
    expect(screen.getByRole('header', { name: 'Arrive by' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Close' })).toBeOnTheScreen();
    expect(screen.getByText('8:50 AM')).toBeOnTheScreen();
  });

  it('shows nothing while hidden, and goes when the caller hides it', async () => {
    const onClose = jest.fn();
    await render(sheet(false, onClose));
    expect(screen.queryByText('8:50 AM')).not.toBeOnTheScreen();

    await screen.rerender(sheet(true, onClose));
    expect(screen.getByText('8:50 AM')).toBeOnTheScreen();

    await screen.rerender(sheet(false, onClose));
    expect(screen.queryByText('8:50 AM')).not.toBeOnTheScreen();
    expect(onClose).not.toHaveBeenCalled(); // the caller closed it; it is not told again
  });

  it('calls onClose once when the close button is pressed', async () => {
    const onClose = jest.fn();
    await render(sheet(true, onClose));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await screen.rerender(sheet(false, onClose)); // the caller closes it in answer
    expect(screen.queryByText('8:50 AM')).not.toBeOnTheScreen();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose once when the backdrop is tapped', async () => {
    const onClose = jest.fn();
    await render(sheet(true, onClose));
    await fireEvent.press(screen.getByRole('button', { name: 'Close Arrive by' }));
    expect(screen.queryByText('8:50 AM')).not.toBeOnTheScreen();
    expect(onClose).toHaveBeenCalledTimes(1);

    await screen.rerender(sheet(false, onClose));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose once when dragged closed', async () => {
    const onClose = jest.fn();
    await render(sheet(true, onClose));
    await fireEvent(screen.getByTestId('bottom-sheet'), 'dragClose');
    expect(screen.queryByText('8:50 AM')).not.toBeOnTheScreen();
    expect(onClose).toHaveBeenCalledTimes(1);

    await screen.rerender(sheet(false, onClose));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Android back, once, and leaves back alone while hidden', async () => {
    const onClose = jest.fn();
    await render(sheet(true, onClose));
    expect(pressBack?.()).toBe(true); // handled: the screen under the sheet stays
    expect(onClose).toHaveBeenCalledTimes(1);

    await screen.rerender(sheet(false, onClose));
    expect(pressBack).toBeUndefined();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens again after closing, and reports the next close too', async () => {
    const onClose = jest.fn();
    await render(sheet(true, onClose));
    await fireEvent(screen.getByTestId('bottom-sheet'), 'dragClose');
    await screen.rerender(sheet(false, onClose));
    await screen.rerender(sheet(true, onClose));
    expect(screen.getByText('8:50 AM')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('is styled from the tokens, with a scrim that fades with the sheet', async () => {
    await render(sheet(true, () => {}));
    expect(screen.getByTestId('bottom-sheet')).toHaveStyle({
      backgroundColor: color.surface,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
    });
    expect(screen.getByTestId('bottom-sheet-handle')).toHaveStyle({ backgroundColor: color.border });
    const backdrop = screen.getByTestId('bottom-sheet-backdrop');
    expect(backdrop).toHaveStyle({ backgroundColor: color.scrim });
    // Fully clear at index -1 (closed), full scrim at index 0 (open): the library fades it in between as it drags.
    expect(backdrop.props).toMatchObject({ disappearsOnIndex: -1, appearsOnIndex: 0, opacity: 1 });
  });

  it('sizes to its content up to 90% of the screen, drags closed and rides the keyboard', async () => {
    await render(sheet(true, () => {}));
    expect(screen.getByTestId('bottom-sheet').props).toMatchObject({
      enableDynamicSizing: true,
      maxDynamicContentSize: Math.round(Dimensions.get('window').height * 0.9),
      enablePanDownToClose: true,
      keyboardBehavior: 'interactive',
    });
  });

  it('pins a footer under the content', async () => {
    await render(sheet(true, () => {}, { footer: <Text>Save</Text> }));
    expect(screen.getByTestId('bottom-sheet-footer')).toHaveTextContent('Save');
  });

  it('puts a custom header beside the close button instead of the title', async () => {
    await render(sheet(true, () => {}, { header: <Text>Manager</Text> }));
    expect(screen.getByText('Manager')).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Arrive by' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Close' })).toBeOnTheScreen();
  });

  it('offers the library text input, which keeps the keyboard off the sheet', () => {
    expect(SheetTextInput).toBe(BottomSheetTextInput);
  });
});
