import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { NoticeCard } from '@/notice/NoticeCard';
import type { Notice } from '@/notice/useNotice';
import { theme } from '@/theme';

const notice: Notice = { eta: '9:15', lateMin: 15, text: 'Running about 15 min late, there by 9:15.' };
const contact = { name: 'Mary', phone: '254700000000', relationship: 'manager' };

let reduceMotion = false;
beforeEach(() => {
  reduceMotion = false;
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(() => Promise.resolve(reduceMotion));
  jest.useFakeTimers();
});
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('NoticeCard', () => {
  it('comes in and goes out with the shared enter and exit presets', async () => {
    await render(<NoticeCard notice={notice} contact={contact} onPress={() => {}} />);
    const card = screen.getByTestId('notice-card');
    expect(card).toContainElement(screen.getByText(notice.text));
    expect(card.props.entering?.getDuration()).toBe(theme.motion.duration.base);
    expect(card.props.exiting?.getDuration()).toBe(theme.motion.duration.fast);
  });

  it('appears and goes at once with reduce motion on', async () => {
    reduceMotion = true;
    await render(<NoticeCard notice={notice} contact={contact} onPress={() => {}} />);
    const card = screen.getByTestId('notice-card');
    expect(card.props.entering).toBeUndefined();
    expect(card.props.exiting).toBeUndefined();
  });

  it('breathes the message on Reanimated while Claude is writing it, and rests at full once it is written', async () => {
    const { rerender } = await render(<NoticeCard notice={notice} contact={contact} loading onPress={() => {}} />);
    await act(() => jest.advanceTimersByTime(650));
    expect(screen.getByText(notice.text)).toHaveAnimatedStyle({ opacity: 0.4 });
    await rerender(<NoticeCard notice={notice} contact={contact} loading={false} onPress={() => {}} />);
    expect(screen.getByText(notice.text)).toHaveAnimatedStyle({ opacity: 1 });
  });
});
