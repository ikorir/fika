// The links that open a prefilled message. Opening one never sends anything: the commuter presses send there.
// iOS reads an SMS body after "&", Android after "?".

export function noticeLinks(phone: string, text: string, os: 'ios' | 'android') {
  const digits = phone.replace(/\D/g, '');
  const body = encodeURIComponent(text);
  return {
    whatsapp: `whatsapp://send?${digits ? `phone=${digits}&` : ''}text=${body}`,
    sms: `sms:${digits ? `+${digits}` : ''}${os === 'ios' ? '&' : '?'}body=${body}`,
  };
}
