import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { savedCommute, savedRoutes, scriptSteps } from '@/demo/saved';
import { theme } from '@/theme';
import { SimulationBanner } from '@/today/SimulationBanner';

const steps = scriptSteps(savedCommute, savedRoutes.samples, new Date('2026-09-20T22:00:00+03:00'));
const atRisk = steps.find((s) => s.scenario === 'at_risk')!.evaluation;

let reduceMotion = false;
beforeEach(() => {
  reduceMotion = false;
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(() => Promise.resolve(reduceMotion));
});
afterEach(() => jest.restoreAllMocks());


describe('SimulationBanner', () => {
  it('shows nothing while nothing is simulated', async () => {
    await render(<SimulationBanner evaluation={{ ...atRisk, simulated: false }} />);
    expect(screen.queryByText(/SIMULATED TRAFFIC/)).toBeNull();
  });

  it('comes in and goes out with the shared enter and exit presets', async () => {
    expect(atRisk.simulated).toBe(true);
    await render(<SimulationBanner evaluation={atRisk} />);
    const shown = screen.getByTestId('simulation-banner');
    expect(shown).toContainElement(screen.getByText(/^SIMULATED TRAFFIC/));
    expect(shown.props.entering?.getDuration()).toBe(theme.motion.duration.base);
    expect(shown.props.exiting?.getDuration()).toBe(theme.motion.duration.fast);
  });

  it('appears and goes at once with reduce motion on', async () => {
    reduceMotion = true;
    await render(<SimulationBanner evaluation={atRisk} saved />);
    const shown = screen.getByTestId('simulation-banner');
    expect(shown.props.entering).toBeUndefined();
    expect(shown.props.exiting).toBeUndefined();
  });
});
