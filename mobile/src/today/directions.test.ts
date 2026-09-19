import { directionsUrl } from '@/today/directions';

const home = { lat: -1.264, lng: 36.747 };
const work = { lat: -1.2985, lng: 36.8155 };
const onWaiyakiWay = { lat: -1.2712, lng: 36.7905 };

describe('the Google Maps hand-off', () => {
  it('asks for driving directions for the commute', () => {
    expect(directionsUrl(home, work)).toBe(
      'https://www.google.com/maps/dir/?api=1&origin=-1.264,36.747&destination=-1.2985,36.8155&travelmode=driving',
    );
  });

  it('sends the drive through the chosen route, so it is the one Google opens', () => {
    expect(directionsUrl(home, work, onWaiyakiWay)).toBe(
      'https://www.google.com/maps/dir/?api=1&origin=-1.264,36.747&destination=-1.2985,36.8155' +
        '&waypoints=-1.2712,36.7905&travelmode=driving',
    );
  });

  it('leaves the waypoint out when no route is selected, rather than sending an empty one', () => {
    expect(directionsUrl(home, work, undefined)).not.toContain('waypoints');
  });

  it('keeps southern and western coordinates negative', () => {
    expect(directionsUrl({ lat: -1.5, lng: -36.5 }, work)).toContain('origin=-1.5,-36.5');
  });
});
