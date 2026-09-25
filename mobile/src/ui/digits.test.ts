import { alignRight, diffDigits, isClockTime } from '@/ui/digits';

const same = (char: string) => ({ char, changed: false, direction: null });

describe('diffDigits', () => {
  it('marks nothing as changed between equal strings', () => {
    expect(diffDigits('8:05', '8:05')).toEqual(['8', ':', '0', '5'].map(same));
  });

  it('rolls a digit that goes up, up', () => {
    expect(diffDigits('8:05', '8:06')).toEqual([same('8'), same(':'), same('0'), { char: '6', changed: true, direction: 'up' }]);
  });

  it('rolls a digit that goes down, down', () => {
    expect(diffDigits('8:59', '8:52')).toEqual([same('8'), same(':'), same('5'), { char: '2', changed: true, direction: 'down' }]);
  });

  it('decides each digit on its own', () => {
    expect(diffDigits('7:50', '9:13')).toEqual([
      { char: '9', changed: true, direction: 'up' },
      same(':'),
      { char: '1', changed: true, direction: 'down' },
      { char: '3', changed: true, direction: 'up' },
    ]);
  });

  it('aligns a longer time from the right, and rolls a new leading digit up', () => {
    expect(diffDigits('9:55', '10:05')).toEqual([
      { char: '1', changed: true, direction: 'up' },
      { char: '0', changed: true, direction: 'down' },
      same(':'),
      { char: '0', changed: true, direction: 'down' },
      same('5'),
    ]);
  });

  it('aligns a shorter time from the right', () => {
    expect(diffDigits('10:05', '9:55')).toEqual([
      { char: '9', changed: true, direction: 'up' },
      same(':'),
      { char: '5', changed: true, direction: 'up' },
      same('5'),
    ]);
  });

  it('never rolls the colon', () => {
    for (const { char, direction } of diffDigits('23:59', '0:00').filter((d) => d.char === ':')) {
      expect(char).toBe(':');
      expect(direction).toBeNull();
    }
  });

  it('never rolls anything that is not a digit', () => {
    expect(diffDigits('Now', 'Now')).toEqual(['N', 'o', 'w'].map(same));
    expect(diffDigits('Now', 'Late')).toEqual([
      { char: 'L', changed: true, direction: null },
      { char: 'a', changed: true, direction: null },
      { char: 't', changed: true, direction: null },
      { char: 'e', changed: true, direction: null },
    ]);
    // A digit taking a letter's place, or a letter a digit's, swaps; only digit to digit rolls.
    expect(diffDigits('Late', '9:13')).toEqual([
      { char: '9', changed: true, direction: null },
      { char: ':', changed: true, direction: null },
      { char: '1', changed: true, direction: null },
      { char: '3', changed: true, direction: null },
    ]);
    expect(diffDigits('9:13', 'Late').map((d) => d.direction)).toEqual([null, null, null, null]);
  });

  it('is pure: the same answer every time, and its inputs untouched', () => {
    const prev = '9:55';
    const next = '10:05';
    expect(diffDigits(prev, next)).toEqual(diffDigits(prev, next));
    expect([prev, next]).toEqual(['9:55', '10:05']);
  });
});

describe('alignRight', () => {
  it('pads a shorter string on the left and cuts a longer one from the left', () => {
    expect(alignRight('9:55', 5)).toEqual(['', '9', ':', '5', '5']);
    expect(alignRight('10:05', 4)).toEqual(['0', ':', '0', '5']);
    expect(alignRight('8:05', 4)).toEqual(['8', ':', '0', '5']);
  });
});

describe('isClockTime', () => {
  it.each(['7:50', '10:05', '0:00', '23:59'])('knows %s is a clock time', (s) => expect(isClockTime(s)).toBe(true));
  it.each(['Now', '', '8', '8:5', '8:055', 'in 20 min', '12:30 pm'])('knows %p is not', (s) =>
    expect(isClockTime(s)).toBe(false),
  );
});
