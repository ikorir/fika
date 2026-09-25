import { bubblePath, withAlpha } from '@/today/marks';

describe('withAlpha', () => {
  it('turns a colour token into the same colour at an opacity', () => {
    expect(withAlpha('#F28C38', 0.2)).toBe('rgba(242,140,56,0.2)');
    expect(withAlpha('#FFFFFF', 0.3)).toBe('rgba(255,255,255,0.3)');
    expect(withAlpha('#000000', 1)).toBe('rgba(0,0,0,1)');
  });
});

describe('bubblePath', () => {
  const points = (d: string) =>
    [...d.matchAll(/[MHVLA]([^MHVLAZ]*)/g)].map((m) => m[0]).filter((s) => /^[ML]/.test(s)).map((s) => s.slice(1).split(' ').map(Number));

  it('is a closed outline that starts on the top edge', () => {
    const d = bubblePath(60, 22, 11, 5);
    expect(d.startsWith('M11 0')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('points its tail straight down from the middle of the foot, the tip at the road', () => {
    const d = bubblePath(60, 22, 11, 5);
    const tip = points(d).find(([, y]) => y === 27);
    expect(tip).toEqual([30, 27]);
    expect(d).toContain('H35L30 27L25 22'); // a 10 pt base centred on the tip
  });

  it('rounds all four corners with the bubble’s radius', () => {
    const d = bubblePath(60, 22, 11, 5);
    expect(d.match(/A11 11 0 0 1/g)).toHaveLength(4);
  });

  it('keeps the tail clear of the corners on a narrow bubble', () => {
    const d = bubblePath(26, 22, 11, 5);
    expect(d).toContain('H15L13 27L11 22');
  });
});
