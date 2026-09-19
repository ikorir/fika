// The dark map ground from design/DESIGN.md, for Google Maps on Android. iOS draws Apple Maps' own dark
// appearance instead, which takes no style JSON. Labels are kept to a minimum: the route names are on the cards.
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0C0E11' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6E6E76' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0C0E11' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0F1712' }, { visibility: 'on' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0F1712' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1A1E25' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#222833' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#070A0D' }] },
];
