// The one bottom sheet (D4): a round close button and a title over whatever the sheet is for, on
// `@gorhom/bottom-sheet`. It sizes to its content up to 90% of the screen and scrolls past that, drags down to
// close, and its scrim fades as it goes. A text field inside it has to be a `SheetTextInput`, so the keyboard lifts
// the sheet instead of covering it.
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetFooter,
  type BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { type ReactNode, useEffect, useRef } from 'react';
import { BackHandler, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { theme } from '@/theme';
import { Press } from '@/ui/Press';

const { color, type } = theme;

/** The text field for a sheet: with the keyboard up, the sheet moves up by the keyboard's height. */
export const SheetTextInput = BottomSheetTextInput;

const MAX_HEIGHT = 0.9; // of the screen; taller content scrolls
const GAP = 14; // between the header and each block of content

type Props = {
  visible: boolean;
  /** Names the sheet: the header shows it, and the scrim is "Close <title>" to assistive tech. */
  title: string;
  /** Called once per opening, however the sheet is closed: close button, scrim, drag or Android back. */
  onClose: () => void;
  children: ReactNode;
  /** Pinned to the bottom of the sheet while the content scrolls under it. */
  footer?: ReactNode;
  /** Shown beside the close button in place of the title, for a sheet whose header holds its own controls. */
  header?: ReactNode;
};

export function Sheet({ visible, title, onClose, children, footer, header }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheet = useRef<BottomSheetModal>(null);
  const presented = useRef(false); // on screen, or on its way, until the library says it has gone
  const open = useRef(false); // the caller has it open and has not been told it closed

  // `visible` drives the sheet. Only a sheet that went up is taken down, so a closed sheet's first render is quiet.
  useEffect(() => {
    open.current = visible;
    if (visible) {
      presented.current = true;
      sheet.current?.present();
    } else if (presented.current) {
      sheet.current?.dismiss();
    }
  }, [visible]);

  // Every way out ends here, and the caller hears about each opening's close once: a close the caller started by
  // turning `visible` off is not reported back to it.
  const close = () => {
    if (!open.current) return;
    open.current = false;
    onClose();
  };

  // Android's back button closes the sheet, not the screen under it.
  useEffect(() => {
    if (!visible) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => back.remove();
  }, [visible, close]);

  const backdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={1} // the scrim colour carries its own alpha
      pressBehavior="close"
      accessibilityLabel={`Close ${title}`}
      style={[props.style, styles.scrim]}
    />
  );

  const bottom = Math.max(insets.bottom, 34);
  const pinned = footer
    ? (props: BottomSheetFooterProps) => (
        <BottomSheetFooter {...props}>
          <View style={[styles.footer, { paddingBottom: bottom }]}>{footer}</View>
        </BottomSheetFooter>
      )
    : undefined;

  return (
    <BottomSheetModal
      ref={sheet}
      enableDynamicSizing
      maxDynamicContentSize={Math.round(height * MAX_HEIGHT)}
      topInset={insets.top}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      enableBlurKeyboardOnGesture
      // The library's default makes the whole sheet one element to VoiceOver, hiding every control inside it.
      accessible={false}
      backdropComponent={backdrop}
      footerComponent={pinned}
      backgroundStyle={styles.background}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.indicator}
      onDismiss={() => {
        presented.current = false;
        close();
      }}
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        enableFooterMarginAdjustment={!!footer}
        contentContainerStyle={[styles.content, { paddingBottom: footer ? GAP : bottom }]}
      >
        <View style={styles.header}>
          <Press accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={styles.close}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.text} strokeWidth={2} strokeLinecap="round">
              <Path d="M6 6l12 12M18 6 6 18" />
            </Svg>
          </Press>
          {header ?? (
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
          )}
        </View>
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: color.surface,
    borderTopLeftRadius: theme.radius.sheet,
    borderTopRightRadius: theme.radius.sheet,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  scrim: { backgroundColor: color.scrim },
  handle: { paddingTop: 8, paddingBottom: 4 },
  indicator: { width: 36, height: 5, borderRadius: 2.5, backgroundColor: color.border },
  content: { paddingTop: 8, paddingHorizontal: 16, gap: GAP },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  close: {
    width: theme.size.roundButton,
    height: theme.size.roundButton,
    borderRadius: theme.size.roundButton / 2,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.sheetTitle, color: color.text, flex: 1 },
  footer: { paddingTop: 12, paddingHorizontal: 16, backgroundColor: color.surface },
});
