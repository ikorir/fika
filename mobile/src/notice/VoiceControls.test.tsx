import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { LanguageChips, ToneSwitch } from '@/notice/VoiceControls';

beforeEach(() => jest.clearAllMocks());

describe('the tone and language chips', () => {
  it('pick a tone with a light tap', async () => {
    const onChange = jest.fn();
    await render(<ToneSwitch tone="manager" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Friend' }));
    expect(onChange).toHaveBeenCalledWith('friend');
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('pick a language with a light tap', async () => {
    const onChange = jest.fn();
    await render(<LanguageChips language="en" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Sheng' }));
    expect(onChange).toHaveBeenCalledWith('sheng');
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });
});
