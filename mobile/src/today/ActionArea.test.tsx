import { render, screen } from '@testing-library/react-native';

import { savedCommute, savedRoutes, scriptSteps } from '@/demo/saved';
import { ActionArea } from '@/today/ActionArea';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const evaluation = scriptSteps(savedCommute, savedRoutes.samples, new Date('2026-09-20T22:00:00+03:00'))[0].evaluation;
const now = new Date('2026-09-21T07:30:00+03:00');

describe('ActionArea footer at large text sizes', () => {
  it('caps both footer texts at 1.6 times and lets the link wrap onto its own line, on the right', async () => {
    await render(
      <ActionArea
        commute={savedCommute}
        updatedAt={now.toISOString()}
        now={now}
        evaluation={evaluation}
        reminder={{ at: null, set: false, toggle: () => {} }}
        onSelectRoute={() => {}}
        onReviewNotice={() => {}}
      />,
    );
    const updated = screen.getByText(/^Updated /);
    const link = screen.getByText('Open in Google Maps');
    expect(updated.props.maxFontSizeMultiplier).toBe(1.6);
    expect(link.props.maxFontSizeMultiplier).toBe(1.6);

    const linkPress = screen.getByRole('link');
    expect(linkPress).toHaveStyle({ marginLeft: 'auto' }); // right-aligned, on its own line or beside the label
    expect(linkPress.parent).toHaveStyle({ flexDirection: 'row', flexWrap: 'wrap' });
  });
});
