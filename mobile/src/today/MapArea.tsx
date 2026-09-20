import Constants from 'expo-constants';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import type { Commute, Evaluation, LatLng, RouteView } from '@/contract';
import { theme } from '@/theme';
import { HeaderControls } from '@/today/HeaderControls';
import { darkMapStyle } from '@/today/map-style';
import { decodePath, distinctPoint, pointAlong } from '@/today/path';

const { color } = theme;

type Props = {
  commute: Commute;
  routes: RouteView[]; // `selected` marks the highlighted line
  state?: Evaluation['state'];
  incidentRouteId?: string; // the route a simulated accident is on, if any
  onSelectRoute: (routeId: string) => void; // tapping a route line or its ETA bubble
  onRefresh: () => void;
  onDemo: () => void;
  demoOn: boolean;
};

// Android draws Google Maps, and its SDK throws "API key not found" the moment a map view is created in a build
// made without GOOGLE_MAPS_ANDROID_KEY (see app.config.js). A missing map is a gap; that exception is the whole app
// gone at launch. iOS draws Apple Maps and needs no key.
const MAP_AVAILABLE = Platform.OS !== 'android' || !!Constants.expoConfig?.android?.config?.googleMaps?.apiKey;

const coord = (p: LatLng) => ({ latitude: p.lat, longitude: p.lng });

// The routes drawn on the top third of the screen, with the header controls floating over them.
// No live location dot and no search: the map is here to show where the routes differ.
export function MapArea({ commute, routes, state, incidentRouteId, onSelectRoute, onRefresh, onDemo, demoOn }: Props) {
  const insets = useSafeAreaInsets();
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(0);
  const lines = useLines(routes);
  // Unselected routes fade back once the commute is late: only the one being driven still matters.
  const idle = state === 'late' ? color.routeDim : color.routeIdle;
  const incident = lines.get(incidentRouteId ?? '');
  const redrawing = useRedrawing(
    `${state}|${routes.map((r) => `${r.id}:${r.durationMin}:${r.selected}`).join(',')}|${incidentRouteId ?? ''}`,
  );

  // The whole commute is on screen without anyone panning or zooming, and it re-fits whenever the routes change.
  // It waits for a laid-out map: fitting into a frame that has no height yet zooms out to half the country.
  // The padding is small because the map itself is only 250 pt tall; the lines may run under the floating
  // controls, as they do in the design, but they stay clear of the fade at the foot of the map.
  useEffect(() => {
    const points = [...lines.values()].flatMap((l) => l.coords);
    if (!ready || height === 0 || points.length === 0) return;
    map.current?.fitToCoordinates(points, {
      edgePadding: { top: 30, right: 12, bottom: 20, left: 12 },
      animated: true,
    });
  }, [ready, height, lines, insets.top]);

  if (!MAP_AVAILABLE) {
    return (
      <View style={styles.map}>
        <Text style={styles.noMap}>Map unavailable: this build has no Google Maps key.</Text>
        <View style={[styles.controls, { top: insets.top + 6 }]}>
          <HeaderControls onRefresh={onRefresh} onDemo={onDemo} demoOn={demoOn} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.map} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        onMapReady={() => setReady(true)}
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
        {/* A wide invisible line under each route: a 4 pt line is too thin to hit with a thumb. */}
        {routes.map((r) => {
          const line = lines.get(r.id);
          return line ? (
            <Polyline
              key={`hit-${r.id}`}
              coordinates={line.coords}
              strokeColor="rgba(0,0,0,0.01)"
              strokeWidth={22}
              zIndex={0}
              tappable
              onPress={() => onSelectRoute(r.id)}
            />
          ) : null;
        })}
        {/* The selected route is drawn last so it sits over the others. */}
        {[...routes]
          .sort((a, b) => Number(a.selected) - Number(b.selected))
          .map((r) => {
            const line = lines.get(r.id);
            return line ? (
              <Polyline
                key={r.id}
                coordinates={line.coords}
                strokeColor={r.selected ? color.accent : idle}
                strokeWidth={r.selected ? 5 : 4}
                zIndex={r.selected ? 2 : 1}
                lineCap="round"
                lineJoin="round"
                tappable
                onPress={() => onSelectRoute(r.id)}
              />
            ) : null;
          })}
        <Marker coordinate={coord(commute.origin.location)} anchor={ANCHOR} zIndex={6} title={commute.origin.label}>
          <View style={styles.origin} />
        </Marker>
        <Marker
          coordinate={coord(commute.destination.location)}
          anchor={ANCHOR}
          zIndex={6}
          title={commute.destination.label}
        >
          <View style={styles.destination}>
            <View style={styles.destinationCore} />
          </View>
        </Marker>
        {/* How long each way takes, sitting on its own line. */}
        {routes.map((r) => {
          const line = lines.get(r.id);
          return line?.mid ? (
            <Marker
              key={`eta-${r.id}`}
              coordinate={line.mid}
              anchor={ABOVE}
              zIndex={r.selected ? 4 : 3}
              tracksViewChanges={redrawing}
              onPress={() => onSelectRoute(r.id)}
            >
              <View style={r.selected ? styles.bubbleOn : styles.bubble}>
                <Text style={r.selected ? styles.bubbleOnText : styles.bubbleText}>{r.durationMin} min</Text>
              </View>
            </Marker>
          ) : null;
        })}
        {/* What the simulated accident is doing to the route it is on. */}
        {incident?.incident && (
          <Marker coordinate={incident.incident} anchor={BELOW} zIndex={5} tracksViewChanges={redrawing}>
            <View style={[styles.incident, { backgroundColor: state === 'late' ? color.late : color.atRisk }]}>
              <Svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke={state === 'late' ? color.lateTint : color.atRiskTint}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M12 4 2.5 20h19zM12 10v5M12 17.5v.5" />
              </Svg>
            </View>
          </Marker>
        )}
      </MapView>
      <MapFade />
      <View style={[styles.controls, { top: insets.top + 6 }]}>
        <HeaderControls onRefresh={onRefresh} onDemo={onDemo} demoOn={demoOn} />
      </View>
    </View>
  );
}

const ANCHOR = { x: 0.5, y: 0.5 };
// An ETA bubble rides above its line and the incident marker hangs below it, so the two never cover each other
// when the accident happens to be where a route parts from the rest.
const ABOVE = { x: 0.5, y: 1.2 };
const BELOW = { x: 0.5, y: -0.2 };

// Decoding is the expensive part, and the Today screen re-renders on every tick, so the lines are keyed on the
// encoded shapes themselves: selecting a route re-styles them without decoding anything again.
function useLines(routes: RouteView[]) {
  const key = routes.map((r) => `${r.id}:${r.polyline}`).join('|');
  return useMemo(
    () =>
      (() => {
        const paths = routes.map((r) => decodePath(r.polyline));
        return new Map(
          routes.map((r, i) => {
            const path = paths[i];
            const at = (p: LatLng | undefined) => p && coord(p);
            return [
              r.id,
              {
                coords: path.map(coord),
                // The ETA bubble goes where this route parts from the others, which is both where it says the
                // most and where it cannot land on another route's bubble. Failing that, its middle.
                mid: at(distinctPoint(path, paths.filter((_, j) => j !== i)) ?? pointAlong(path, 0.5)),
                incident: at(pointAlong(path, 0.6)),
              },
            ];
          }),
        );
      })(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
}

/**
 * A marker drawn from React views only appears once the map has copied it into an image, and keeping that on
 * redraws every marker on every frame. So it is on for a moment after anything a marker shows changes.
 */
function useRedrawing(key: string) {
  const [redrawing, setRedrawing] = useState(true);
  useEffect(() => {
    setRedrawing(true);
    const done = setTimeout(() => setRedrawing(false), 1000);
    return () => clearTimeout(done);
  }, [key]);
  return redrawing;
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

const FADE = 44; // the height of that fade, which the fit keeps the routes clear of

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
  noMap: { ...theme.type.meta, color: color.textMuted, textAlign: 'center', marginTop: 150, paddingHorizontal: 32 },
  controls: { position: 'absolute', left: theme.space.screen, right: theme.space.screen },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: FADE },
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
  bubble: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 11, backgroundColor: color.control },
  bubbleText: { ...theme.type.segment, fontSize: 12, color: color.textChip },
  bubbleOn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: color.accent },
  bubbleOnText: { ...theme.type.metaStrong, fontFamily: theme.font.bold, color: color.onAccent },
  incident: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
