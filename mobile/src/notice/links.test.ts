import { noticeLinks } from '@/notice/links';

const text = 'Hi Mary, I will be about 15 minutes late. My ETA is 9:15.';
const encoded = 'Hi%20Mary%2C%20I%20will%20be%20about%2015%20minutes%20late.%20My%20ETA%20is%209%3A15.';

describe('the WhatsApp link', () => {
  it("opens a chat with the contact's international digits, the text prefilled", () => {
    expect(noticeLinks('254700000000', text, 'ios').whatsapp).toBe(
      `whatsapp://send?phone=254700000000&text=${encoded}`,
    );
  });

  it('drops the plus sign, spaces and dashes from the number', () => {
    expect(noticeLinks('+254 700-000 000', text, 'ios').whatsapp).toBe(
      `whatsapp://send?phone=254700000000&text=${encoded}`,
    );
  });

  it('keeps an edited draft whole: ampersands, hashes, plus signs, new lines and emoji', () => {
    const url = noticeLinks('254700000000', 'Tom & Jerry #2 +5 min\nsorry 🙏', 'ios').whatsapp;
    expect(url).toBe('whatsapp://send?phone=254700000000&text=Tom%20%26%20Jerry%20%232%20%2B5%20min%0Asorry%20%F0%9F%99%8F');
  });

  it('with no number, leaves the phone out so WhatsApp asks who to send it to', () => {
    expect(noticeLinks('', text, 'ios').whatsapp).toBe(`whatsapp://send?text=${encoded}`);
  });
});

describe('the SMS link', () => {
  it.each([
    { os: 'ios' as const, url: `sms:+254700000000&body=${encoded}` },
    { os: 'android' as const, url: `sms:+254700000000?body=${encoded}` },
  ])("on $os dials the contact's number with the text as its body", ({ os, url }) => {
    expect(noticeLinks('254700000000', text, os).sms).toBe(url);
  });

  it.each([
    { os: 'ios' as const, url: `sms:&body=${encoded}` },
    { os: 'android' as const, url: `sms:?body=${encoded}` },
  ])('on $os with no number, opens the composer for the commuter to pick one', ({ os, url }) => {
    expect(noticeLinks('', text, os).sms).toBe(url);
  });
});
