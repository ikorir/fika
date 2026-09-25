import { render, screen } from '@testing-library/react-native';

import { savedCommute, savedRoutes, scriptSteps } from '@/demo/saved';
import { PrimaryAction } from '@/today/PrimaryAction';

const steps = scriptSteps(savedCommute, savedRoutes.samples, new Date('2026-09-20T22:00:00+03:00'));
const late = steps.find((s) => s.evaluation.state === 'late' && !s.evaluation.betterRouteId)!.evaluation;
const reminder = { at: null, set: false, toggle: () => {} };

describe('PrimaryAction at large text sizes', () => {
  it('keeps its label on one line, shrinking it to 80% before it cuts', async () => {
    await render(<PrimaryAction evaluation={late} reminder={reminder} onSelectRoute={() => {}} onReviewNotice={() => {}} />);
    const label = screen.getByText('Review and send notice');
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.adjustsFontSizeToFit).toBe(true);
    expect(label.props.minimumFontScale).toBe(0.8);
  });
});
