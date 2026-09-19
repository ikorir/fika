import { useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Commute, LatLng, RouteView } from '@/contract';
import { theme } from '@/theme';
import { HeaderControls } from '@/today/HeaderControls';
import { darkMapStyle } from '@/today/map-style';
import { decodePath } from '@/today/path';

const { color } = theme;

type Props = {
  commute: Commute;
  routes: RouteView[]; // `selected` marks the highlighted line
  onSelectRoute: (routeId: string) => void; // tapping a route line
  onRefresh: () => void;
  onDemo: () => void;
  demoOn: boolean;
};

const coord = (p: LatLng) => ({ latitude: p.lat, longitude: p.lng });

// The routes drawn on the top third of the screen, with the header controls floating over them.
// No live location dot and no search: the map is here to show where the routes differ.
export function MapArea({ commute, routes, onRefresh, onDemo, demoOn }: Props) {
  const insets = useSafeAreaInsets();
  const map = useRef<MapView>(null);
  const paths = usePaths(routes);

  return (
    <View style={styles.map}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={regionAround([commute.origin.location, commute.destination.location])}
        customMapStyle={darkMapStyle}
        userInterfaceStyle="dark"
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        loadingBackgroundColor={color.mapBg}
        showsPointsOfInterests={false}
        showsBuildings={false}
        showsTraffic={false}
        showsCompass={false}
        showsIndoors={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {/* The selected route is drawn last so it sits over the others. */}
        {[...routes].sort((a, b) => Number(a.selected) - Number(b.selected)).map((r) => {
          const path = paths.get(r.id);
          return path ? (
            <Polyline
              key={r.id}
              coordinates={path}
              strokeColor={r.selected ? color.accent : color.routeIdle}
              strokeWidth={r.selected ? 5 : 4}
              zIndex={r.selected ? 2 : 1}
              lineCap="round"
              lineJoin="round"
            />
          ) : null;
        })}
        <Marker coordinate={coord(commute.origin.location)} anchor={ANCHOR} title={commute.origin.label}>
          <View style={styles.origin} />
        </Marker>
        <Marker coordinate={coord(commute.destination.location)} anchor={ANCHOR} title={commute.destination.label}>
          <View style={styles.destination}>
            <View style={styles.destinationCore} />
          </View>
        </Marker>
      </MapView>
      <MapFade />
      <View style={[styles.controls, { top: insets.top + 6 }]}>
        <HeaderControls onRefresh={onRefresh} onDemo={onDemo} demoOn={demoOn} />
      </View>
    </View>
  );
}

const ANCHOR = { x: 0.5, y: 0.5 };

// Decoding is the expensive part, and the Today screen re-renders on every tick, so it is keyed on the encoded
// lines themselves: selecting a route re-styles the polylines without decoding them again.
function usePaths(routes: RouteView[]) {
  const key = routes.map((r) => r.polyline).join('|');
  return useMemo(
    () => new Map(routes.map((r) => [r.id, decodePath(r.polyline).map(coord)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
}

/** A region holding the given points, until the routes arrive and the map fits itself to them. */
function regionAround(points: LatLng[]) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const span = (values: number[]) => Math.max((Math.max(...values) - Math.min(...values)) * 1.6, 0.03);
  return {
    latitude: (Math.max(...lats) + Math.min(...lats)) / 2,
    longitude: (Math.max(...lngs) + Math.min(...lngs)) / 2,
    latitudeDelta: span(lats),
    longitudeDelta: span(lngs),
  };
}

/** The map meets the black screen in a soft fade, as in the design. Bands, since there is no gradient library. */
function MapFade() {
  return (
    <View pointerEvents="none" style={styles.fade}>
      {Array.from({ length: 8 }, (_, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: `rgba(0,0,0,${(((i + 1) / 8) ** 2).toFixed(3)})` }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 250, backgroundColor: color.mapBg },
  controls: { position: 'absolute', left: theme.space.screen, right: theme.space.screen },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 64 },
  origin: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#000000', borderWidth: 3, borderColor: color.text },
  destination: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationCore: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: color.onAccent },
});
