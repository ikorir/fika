// Hands the notice to another app. Each of these only opens a prefilled message: the commuter presses send there.
import { Linking, Platform, Share } from 'react-native';

import { noticeLinks } from '@/notice/links';

const links = (phone: string, text: string) => noticeLinks(phone, text, Platform.OS === 'ios' ? 'ios' : 'android');

/** The system share sheet, for a group chat or anywhere else. */
export async function shareNotice(text: string) {
  await Share.share({ message: text });
}

/** The SMS composer; the share sheet where there is none (an iPad, a simulator). */
export async function smsNotice(phone: string, text: string) {
  try {
    await Linking.openURL(links(phone, text).sms);
  } catch {
    await shareNotice(text);
  }
}

/** WhatsApp; the SMS composer when WhatsApp isn't installed, which is when opening its link fails. */
export async function whatsAppNotice(phone: string, text: string) {
  try {
    await Linking.openURL(links(phone, text).whatsapp);
  } catch {
    await smsNotice(phone, text);
  }
}
