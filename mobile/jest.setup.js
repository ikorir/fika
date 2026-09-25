// AsyncStorage is a native module, so tests use the library's own in-memory stand-in for the phone's storage.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Reanimated's own test setup (D1): its worklets runtime is the library's Jest stand-in, animations run on Jest's
// clock, and `toHaveAnimatedStyle` reads an animated style.
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
require('react-native-reanimated').setUpTests();

// Haptics are native: tests get stand-ins that resolve and do nothing, and a test can read what was asked for.
jest.mock('expo-haptics', () => ({
  ...jest.requireActual('expo-haptics'),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

// Bottom sheets (ticket 03). The library's own mock always shows a modal's content and never closes, so tests get a
// stand-in that behaves like the library where a test can see it: a modal shows its backdrop, handle, content and
// footer only between `present()` and its dismissal, and every way it goes calls `onDismiss` once — `dismiss()`, a
// tap on the backdrop, or a drag, which a test fires as `fireEvent(screen.getByTestId('bottom-sheet'), 'dragClose')`.
// The sheet carries the style and sizing props it was given, and a `SheetTextInput` has the testID
// `sheet-text-input`, so a test can tell it from a plain TextInput.
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const RN = require('react-native');
  const library = require('@gorhom/bottom-sheet/mock');
  const h = React.createElement;
  const still = { value: 0, get: () => 0, set: () => {} };
  const Dismiss = React.createContext(() => {});

  const BottomSheetModal = React.forwardRef(function BottomSheetModal(props, ref) {
    const [shown, setShown] = React.useState(false);
    const up = React.useRef(false);
    const onDismiss = React.useRef(props.onDismiss);
    onDismiss.current = props.onDismiss;
    const dismiss = React.useCallback(() => {
      if (!up.current) return;
      up.current = false;
      setShown(false);
      onDismiss.current?.();
    }, []);
    React.useImperativeHandle(ref, () => ({
      present: () => {
        up.current = true;
        setShown(true);
      },
      dismiss,
      close: dismiss,
      forceClose: dismiss,
      expand: () => {},
      collapse: () => {},
      snapToIndex: () => {},
      snapToPosition: () => {},
    }));
    if (!shown) return null;
    const { backdropComponent, footerComponent, handleComponent, handleIndicatorStyle, backgroundStyle, children } = props;
    return h(
      Dismiss.Provider,
      { value: dismiss },
      backdropComponent ? h(backdropComponent, { animatedIndex: still, animatedPosition: still, style: {} }) : null,
      h(
        RN.View,
        {
          testID: 'bottom-sheet',
          style: backgroundStyle,
          onDragClose: dismiss,
          enableDynamicSizing: props.enableDynamicSizing,
          maxDynamicContentSize: props.maxDynamicContentSize,
          enablePanDownToClose: props.enablePanDownToClose,
          keyboardBehavior: props.keyboardBehavior,
        },
        handleComponent === null ? null : h(RN.View, { testID: 'bottom-sheet-handle', style: handleIndicatorStyle }),
        typeof children === 'function' ? children({ data: undefined }) : children,
        footerComponent ? h(footerComponent, { animatedFooterPosition: still }) : null,
      ),
    );
  });

  function BottomSheetBackdrop({ style, pressBehavior = 'close', onPress, accessibilityLabel, opacity, appearsOnIndex, disappearsOnIndex }) {
    const dismiss = React.useContext(Dismiss);
    return h(RN.Pressable, {
      testID: 'bottom-sheet-backdrop',
      accessibilityRole: 'button',
      accessibilityLabel,
      style: [RN.StyleSheet.absoluteFill, style],
      opacity,
      appearsOnIndex,
      disappearsOnIndex,
      onPress: () => {
        onPress?.();
        if (pressBehavior === 'close') dismiss();
      },
    });
  }

  const BottomSheetFooter = ({ style, children }) => h(RN.View, { testID: 'bottom-sheet-footer', style }, children);

  const BottomSheetTextInput = React.forwardRef((props, ref) =>
    h(RN.TextInput, { testID: 'sheet-text-input', ...props, ref }),
  );

  return { ...library, BottomSheetModal, BottomSheetBackdrop, BottomSheetFooter, BottomSheetTextInput };
});
