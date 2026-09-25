import { render, screen } from '@testing-library/react-native';

import { savedCommute, savedRoutes, scriptSteps } from '@/demo/saved';
import { theme } from '@/theme';
import { ActionArea } from '@/today/ActionArea';
import { updatedLabel } from '@/today/freshness';

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

describe('ActionArea freshness', () => {
  const renderAt = (fetchedAt: Date) =>
    render(
      <ActionArea
        commute={savedCommute}
        updatedAt={fetchedAt.toISOString()}
        now={now}
        evaluation={evaluation}
        reminder={{ at: null, set: false, toggle: () => {} }}
        onSelectRoute={() => {}}
        onReviewNotice={() => {}}
      />,
    );

  it('puts a 6 pt green dot before the label while the numbers are fresh, and keeps the label as it was', async () => {
    const fetchedAt = new Date(now.getTime() - 9 * 60_000);
    await renderAt(fetchedAt);
    const dot = screen.getByTestId('freshness-dot');
    expect(dot).toHaveStyle({ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.color.onTime });
    expect(screen.getByText(updatedLabel(fetchedAt.toISOString(), now).text)).toBeOnTheScreen();
    expect(dot.parent?.children[1]).toBe(screen.getByText(/^Updated /)); // the dot comes first
  });

  it('turns the dot amber once the numbers are stale', async () => {
    const fetchedAt = new Date(now.getTime() - 25 * 60_000);
    await renderAt(fetchedAt);
    expect(screen.getByTestId('freshness-dot')).toHaveStyle({ backgroundColor: theme.color.atRisk });
    expect(screen.getByText('Updated 7:05 · 25 min old')).toBeOnTheScreen();
  });
});
