import { render, screen } from '@testing-library/react-native';
import { PixelRatio } from 'react-native';

import { savedCommute, savedRoutes, scriptSteps } from '@/demo/saved';
import { formatTime } from '@/time';
import { Hero, heroSize } from '@/today/Hero';

const HERO_CAP = 64 * 1.2; // the most the hero time ever measures on screen
const onScreen = (scale: number) => {
  const { fontSize, maxFontSizeMultiplier } = heroSize(scale);
  return fontSize * Math.min(scale, maxFontSizeMultiplier);
};

describe('heroSize', () => {
  it.each([
    [1.0, 64],
    [1.3, 64],
    [1.31, 52],
    [2.0, 52],
  ])('at text scale %s is %s pt, and never beyond 64 × 1.2 on screen', (scale, fontSize) => {
    const size = heroSize(scale);
    expect(size.fontSize).toBe(fontSize);
    expect(size.lineHeight).toBe(fontSize);
    expect(size.fontSize * size.maxFontSizeMultiplier).toBeCloseTo(HERO_CAP);
    expect(onScreen(scale)).toBeLessThanOrEqual(HERO_CAP + 1e-9);
  });

  it('keeps 64 pt at the standard text size', () => {
    expect(onScreen(1)).toBe(64);
  });
});

describe('Hero at large text sizes', () => {
  const evaluation = scriptSteps(savedCommute, savedRoutes.samples, new Date('2026-09-20T22:00:00+03:00'))[0].evaluation;
  afterEach(() => jest.restoreAllMocks());

  const heroTime = () => screen.getByText(formatTime(evaluation.departAt));

  it('draws the time at 64 pt at the standard text size', async () => {
    jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(1);
    await render(<Hero commute={savedCommute} evaluation={evaluation} />);
    expect(heroTime()).toHaveStyle({ fontSize: 64, lineHeight: 64 });
    expect(heroTime().props.maxFontSizeMultiplier).toBe(1.2);
  });

  it('draws the time at 52 pt above a 1.3 text scale', async () => {
    jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(2);
    await render(<Hero commute={savedCommute} evaluation={evaluation} />);
    expect(heroTime()).toHaveStyle({ fontSize: 52, lineHeight: 52 });
    expect(heroTime().props.maxFontSizeMultiplier).toBeCloseTo(HERO_CAP / 52);
  });
});

describe('Hero summary at large text sizes', () => {
  it('grows the commute summary no more than 1.6 times', async () => {
    const evaluation = scriptSteps(savedCommute, savedRoutes.samples, new Date('2026-09-20T22:00:00+03:00'))[0].evaluation;
    await render(<Hero commute={savedCommute} evaluation={evaluation} />);
    expect(screen.getByText(/ to .* · arrive by /).props.maxFontSizeMultiplier).toBe(1.6);
  });
});
