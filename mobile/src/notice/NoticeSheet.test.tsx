import { fireEvent, render, screen } from '@testing-library/react-native';

import { NoticeSheet } from '@/notice/NoticeSheet';
import { shareNotice, smsNotice, whatsAppNotice } from '@/notice/send';
import type { Notice } from '@/notice/useNotice';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/notice/send', () => ({ whatsAppNotice: jest.fn(), smsNotice: jest.fn(), shareNotice: jest.fn() }));

const notice: Notice = { eta: '9:15', lateMin: 15, text: 'Hi Mary, I will be about 15 minutes late. My ETA is 9:15.' };
const contact = { name: 'Mary', phone: '254700000000', relationship: 'manager' };

const renderSheet = (props: Partial<React.ComponentProps<typeof NoticeSheet>> = {}) =>
  render(
    <NoticeSheet
      visible
      notice={notice}
      contact={contact}
      voice={{ tone: 'manager', language: 'en' }}
      onTone={() => {}}
      onLanguage={() => {}}
      onEdit={() => {}}
      onClose={() => {}}
      {...props}
    />,
  );

beforeEach(() => jest.clearAllMocks());

describe('NoticeSheet', () => {
  it('shows the locked ETA and lateness chips when visible', async () => {
    await renderSheet();
    expect(screen.getByLabelText('ETA 9:15, locked')).toBeOnTheScreen();
    expect(screen.getByLabelText('about 15 min late, locked')).toBeOnTheScreen();
    expect(screen.getByText('from your route, not AI')).toBeOnTheScreen();
  });

  it('shows nothing while hidden', async () => {
    await renderSheet({ visible: false });
    expect(screen.queryByLabelText('ETA 9:15, locked')).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Message')).not.toBeOnTheScreen();
  });

  it('keeps the tone switch, language chips and To row', async () => {
    const onTone = jest.fn();
    const onLanguage = jest.fn();
    await renderSheet({ onTone, onLanguage });
    expect(screen.getByRole('radio', { name: 'Manager', checked: true })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'English', checked: true })).toBeOnTheScreen();
    expect(screen.getByText('Mary · manager')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Friend' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Swahili' }));
    expect(onTone).toHaveBeenCalledWith('friend');
    expect(onLanguage).toHaveBeenCalledWith('sw');
  });

  it('edits the message in the sheet text field, so the keyboard lifts the sheet', async () => {
    const onEdit = jest.fn();
    await renderSheet({ onEdit });
    const message = screen.getByLabelText('Message');
    expect(message).toBe(screen.getByTestId('sheet-text-input'));
    expect(message).toHaveDisplayValue(notice.text);
    await fireEvent.changeText(message, 'Stuck on Waiyaki Way, there by 9:15.');
    expect(onEdit).toHaveBeenCalledWith('Stuck on Waiyaki Way, there by 9:15.');
  });

  it('sends the message on WhatsApp, by SMS or through Share', async () => {
    await renderSheet();
    await fireEvent.press(screen.getByRole('button', { name: 'Send on WhatsApp' }));
    await fireEvent.press(screen.getByRole('button', { name: 'SMS' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Share' }));
    expect(whatsAppNotice).toHaveBeenCalledWith(contact.phone, notice.text);
    expect(smsNotice).toHaveBeenCalledWith(contact.phone, notice.text);
    expect(shareNotice).toHaveBeenCalledWith(notice.text);
  });

  it('closes once from the close button, and not again when the screen hides it', async () => {
    const onClose = jest.fn();
    await renderSheet({ onClose });
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await screen.rerender(
      <NoticeSheet
        visible={false}
        notice={notice}
        contact={contact}
        voice={{ tone: 'manager', language: 'en' }}
        onTone={() => {}}
        onLanguage={() => {}}
        onEdit={() => {}}
        onClose={onClose}
      />,
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
