import { distinctPoint, pointAlong } from '@/today/path';

// A straight run north, in four equal steps.
const line = [
  { lat: 0, lng: 0 },
  { lat: 1, lng: 0 },
  { lat: 2, lng: 0 },
  { lat: 3, lng: 0 },
  { lat: 4, lng: 0 },
];

describe('a point along a route', () => {
  it('measures the distance, not the number of points', () => {
    expect(pointAlong([{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }, { lat: 9, lng: 0 }], 0.5)).toEqual({ lat: 4.5, lng: 0 });
  });

  it('interpolates inside the leg it lands in', () => {
    expect(pointAlong(line, 0.375)).toEqual({ lat: 1.5, lng: 0 });
  });

  it.each([
    { fraction: 0, lat: 0 },
    { fraction: 1, lat: 4 },
    { fraction: -2, lat: 0 }, // clamped, rather than walking off the end
    { fraction: 5, lat: 4 },
  ])('at $fraction of the way it is at $lat', ({ fraction, lat }) => {
    expect(pointAlong(line, fraction)).toEqual({ lat, lng: 0 });
  });

  it('has no point to give for a route with no shape', () => {
    expect(pointAlong([], 0.5)).toBeUndefined();
  });
});

describe('where a route is most itself', () => {
  // Two ways east that share the first half and part over the second.
  const shared = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 1 },
    { lat: 0, lng: 2 },
  ];
  const north = [...shared, { lat: 1, lng: 3 }, { lat: 1, lng: 4 }];
  const south = [...shared, { lat: -1, lng: 3 }, { lat: -1, lng: 4 }];

  it('is on the stretch the routes do not share, not at their common midpoint', () => {
    expect(distinctPoint(north, [south])).toEqual({ lat: 1, lng: 4 });
    expect(distinctPoint(south, [north])).toEqual({ lat: -1, lng: 4 });
  });

  it('is the middle when the route has no company', () => {
    expect(distinctPoint(north, [])).toEqual(pointAlong(north, 0.5));
  });

  it('is nowhere when two routes run together the whole way', () => {
    expect(distinctPoint(shared, [shared])).toBeUndefined();
  });

  it('is nowhere for a route with no shape', () => {
    expect(distinctPoint([], [north])).toBeUndefined();
  });
});
