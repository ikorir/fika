import { updatedLabel } from '@/today/freshness';

const at = (iso: string) => new Date(iso);

describe('updatedLabel', () => {
  it('is the time alone while the numbers are fresh', () => {
    expect(updatedLabel('2026-09-21T07:40:00+03:00', at('2026-09-21T07:44:00+03:00'))).toEqual({
      text: 'Updated 7:40',
      stale: false,
    });
  });

  it('says how old the numbers are once they have sat a while', () => {
    expect(updatedLabel('2026-09-21T07:40:00+03:00', at('2026-09-21T08:05:00+03:00'))).toEqual({
      text: 'Updated 7:40 · 25 min old',
      stale: true,
    });
  });

  it('counts the hours past the hour', () => {
    expect(updatedLabel('2026-09-21T07:40:00+03:00', at('2026-09-21T08:45:00+03:00')).text).toBe(
      'Updated 7:40 · 1 h 5 min old',
    );
    expect(updatedLabel('2026-09-21T07:40:00+03:00', at('2026-09-21T09:40:00+03:00')).text).toBe(
      'Updated 7:40 · 2 h old',
    );
  });

  it('is still fresh over midnight', () => {
    expect(updatedLabel('2026-09-20T23:58:00+03:00', at('2026-09-21T00:01:00+03:00'))).toEqual({
      text: 'Updated 23:58',
      stale: false,
    });
  });

  it('names the day once the numbers are from another one', () => {
    expect(updatedLabel('2026-09-20T07:40:00+03:00', at('2026-09-21T07:44:00+03:00'))).toEqual({
      text: 'Updated yesterday 7:40',
      stale: true,
    });
    expect(updatedLabel('2026-09-18T07:40:00+03:00', at('2026-09-21T07:44:00+03:00')).text).toBe(
      'Updated 18 Sep 7:40',
    );
  });
});
