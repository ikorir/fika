import * as Haptics from 'expo-haptics';
import { Linking, Share } from 'react-native';

import { shareNotice, smsNotice, whatsAppNotice } from '@/notice/send';

const impact = jest.mocked(Haptics.impactAsync);
let openURL: jest.SpyInstance;
let share: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
});
afterEach(() => jest.restoreAllMocks());

const buzzedBefore = (opened: jest.SpyInstance) =>
  expect(impact.mock.invocationCallOrder[0]).toBeLessThan(opened.mock.invocationCallOrder[0]);

describe('sending the notice', () => {
  it('gives a medium impact before WhatsApp opens', async () => {
    await whatsAppNotice('+254700000001', 'Running late');
    expect(impact).toHaveBeenCalledTimes(1);
    expect(impact).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    buzzedBefore(openURL);
  });

  it('gives a medium impact before the SMS composer opens', async () => {
    await smsNotice('+254700000001', 'Running late');
    expect(impact).toHaveBeenCalledTimes(1);
    expect(impact).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    buzzedBefore(openURL);
  });

  it('gives a medium impact before the share sheet opens', async () => {
    await shareNotice('Running late');
    expect(impact).toHaveBeenCalledTimes(1);
    expect(impact).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    buzzedBefore(share);
  });

  it('buzzes once however far the fallbacks go', async () => {
    openURL.mockRejectedValue(new Error('no app for that link'));
    await whatsAppNotice('+254700000001', 'Running late');
    expect(openURL).toHaveBeenCalledTimes(2); // WhatsApp, then SMS
    expect(share).toHaveBeenCalledTimes(1);
    expect(impact).toHaveBeenCalledTimes(1);
  });
});
