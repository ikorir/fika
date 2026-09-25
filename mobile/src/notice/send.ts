// Hands the notice to another app. Each of these only opens a prefilled message: the commuter presses send there.
// Each press gives one medium impact before the other app opens, however many fallbacks it takes to get there.
import { Linking, Platform, Share } from 'react-native';

import { noticeLinks } from '@/notice/links';
import { sent } from '@/ui/haptics';

const links = (phone: string, text: string) => noticeLinks(phone, text, Platform.OS === 'ios' ? 'ios' : 'android');

/** The system share sheet, for a group chat or anywhere else. */
export async function shareNotice(text: string) {
  sent();
  await share(text);
}

/** The SMS composer; the share sheet where there is none, such as a Wi-Fi-only iPad. */
export async function smsNotice(phone: string, text: string) {
  sent();
  await sms(phone, text);
}

/** WhatsApp; the SMS composer when WhatsApp isn't installed, which is when opening its link fails. */
export async function whatsAppNotice(phone: string, text: string) {
  sent();
  await whatsApp(phone, text);
}

// The last resort, so a failure has nowhere to go.
async function share(text: string) {
  try {
    await Share.share({ message: text });
  } catch (e) {
    console.warn('Could not open the share sheet', e);
  }
}

async function sms(phone: string, text: string) {
  try {
    await Linking.openURL(links(phone, text).sms);
  } catch {
    await share(text);
  }
}

async function whatsApp(phone: string, text: string) {
  try {
    await Linking.openURL(links(phone, text).whatsapp);
  } catch {
    await sms(phone, text);
  }
}
