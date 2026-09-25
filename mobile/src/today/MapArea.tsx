import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Fragment, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Commute, Evaluation, LatLng, RouteView } from '@/contract';
import { theme } from '@/theme';
import { type CameraStep, type CameraView, cameraMove, cameraSteps, fitRegion, moveEnd, type Size } from '@/today/camera';
import { HeaderControls } from '@/today/HeaderControls';
import { darkMapStyle } from '@/today/map-style';
import {
  BUBBLE_ANCHOR,
  DestinationPin,
  EtaBubble,
  INCIDENT_ANCHOR,
  IncidentMarker,
  OriginPin,
} from '@/today/MapMarkers';
import { withAlpha } from '@/today/marks';
import { decodePath, distinctPoint, pointAlong } from '@/today/path';
import { useReduceMotion } from '@/ui/useReduceMotion';

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
const mapAvailable = () => Platform.OS !== 'android' || !!Constants.expoConfig?.android?.config?.googleMaps?.apiKey;

const coord = (p: LatLng) => ({ latitude: p.lat, longitude: p.lng });

// Room around the routes when the camera fits them. Small, because the map itself is only 250 pt tall; the lines may
// run under the floating controls, as they do in the design.
const PADDING = { top: 30, right: 12, bottom: 20, left: 12 };

const LINE = 5; // the selected route's width; the others are a point thinner
const GLOW = withAlpha(color.accent, 0.2); // the soft glow under the selected route, three times its width

// The routes drawn on the top third of the screen, with the header controls floating over them.
// No live location dot and no search: the map is here to show where the routes differ.
export function MapArea({ commute, routes, state, incidentRouteId, onSelectRoute, onRefresh, onDemo, demoOn }: Props) {
  const insets = useSafeAreaInsets();
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState<Size>();
  const lines = useLines(routes);
  const flying = useCamera(map, ready, size, lines, routes.find((r) => r.selected)?.id, state);
  // Unselected routes fade back once the commute is late: only the one being driven still matters.
  const idle = state === 'late' ? color.routeDim : color.routeIdle;
  const incident = lines.get(incidentRouteId ?? '');
  const redrawing = useRedrawing(
    `${state}|${routes.map((r) => `${r.id}:${r.durationMin}:${r.selected}`).join(',')}|${incidentRouteId ?? ''}`,
  );

  if (!mapAvailable()) {
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
    <View
      testID="map-area"
      style={styles.map}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((was) => (was && was.width === width && was.height === height ? was : { width, height }));
      }}
    >
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
        // Tilting is the camera's alone, and only during a switch: Apple Maps shows no pitch while this is off.
        pitchEnabled={flying}
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
        {/* The selected route is drawn last so it sits over the others, on a soft glow of its own. */}
        {[...routes]
          .sort((a, b) => Number(a.selected) - Number(b.selected))
          .map((r) => {
            const line = lines.get(r.id);
            // The road the accident is on, once switched away from: kept in the accident's colour, so the map still
            // shows the way that was given up beside the one taken instead. Solid: Apple Maps breaks a dashed line
            // this long into stray wedges.
            const left = r.id === incidentRouteId && !r.selected;
            return line ? (
              <Fragment key={r.id}>
                {r.selected && (
                  <Polyline
                    coordinates={line.coords}
                    strokeColor={GLOW}
                    strokeWidth={LINE * 3}
                    zIndex={2}
                    lineCap="round"
                    lineJoin="round"
                  />
                )}
                <Polyline
                  coordinates={line.coords}
                  strokeColor={r.selected ? color.accent : left ? color.atRisk : idle}
                  strokeWidth={r.selected ? LINE : LINE - 1}
                  zIndex={r.selected ? 3 : 1}
                  lineCap="round"
                  lineJoin="round"
                  tappable
                  onPress={() => onSelectRoute(r.id)}
                />
              </Fragment>
            ) : null;
          })}
        {/* Every marker is a picture of a view on Google Maps, redrawn only for a moment after it changes. */}
        <Marker
          coordinate={coord(commute.origin.location)}
          anchor={ANCHOR}
          zIndex={6}
          title={commute.origin.label}
          tracksViewChanges={redrawing}
        >
          <OriginPin />
        </Marker>
        <Marker
          coordinate={coord(commute.destination.location)}
          anchor={ANCHOR}
          zIndex={6}
          title={commute.destination.label}
          tracksViewChanges={redrawing}
        >
          <DestinationPin />
        </Marker>
        {/* How long each way takes, sitting on its own line. */}
        {routes.map((r) => {
          const line = lines.get(r.id);
          return line?.mid ? (
            <Marker
              key={`eta-${r.id}`}
              coordinate={line.mid}
              anchor={BUBBLE_ANCHOR}
              zIndex={r.selected ? 4 : 3}
              tracksViewChanges={redrawing}
              onPress={() => onSelectRoute(r.id)}
            >
              <EtaBubble minutes={r.durationMin} tone={r.selected ? 'selected' : r.id === incidentRouteId ? 'left' : 'idle'} />
            </Marker>
          ) : null;
        })}
        {/* What the simulated accident is doing to the route it is on. */}
        {incident?.incident && (
          <Marker coordinate={incident.incident} anchor={INCIDENT_ANCHOR} zIndex={5} tracksViewChanges={redrawing}>
            <IncidentMarker late={state === 'late'} />
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
            // The ETA bubble goes where this route parts from the others, which is both where it says the
            // most and where it cannot land on another route's bubble. Failing that, its middle.
            const mid = distinctPoint(path, paths.filter((_, j) => j !== i)) ?? pointAlong(path, 0.5);
            // The accident sits past halfway, or wherever along the road is furthest from the bubble: the map is too short for both in one place.
            const apart = (p: LatLng | undefined) => (p && mid ? (p.lat - mid.lat) ** 2 + (p.lng - mid.lng) ** 2 : 0);
            const incident = [0.6, 0.2, 0.8].map((f) => pointAlong(path, f)).reduce((a, b) => (apart(b) > apart(a) ? b : a));
            return [r.id, { coords: path.map(coord), mid: at(mid), incident: at(incident) }];
          }),
        );
      })(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
}

type Lines = ReturnType<typeof useLines>;

/**
 * The camera follows the routes instead of jumping: it eases to fit them all when they change, to fit the selected
 * one when the selection changes, and after "Switch to …" tilts on the way before settling flat (`camera.ts`). It
 * waits for a laid-out map: fitting into a frame that has no size yet zooms out to half the country. With reduce
 * motion every move is instant. True while a move that tilts is under way: the map allows pitch only then.
 */
function useCamera(
  map: RefObject<MapView | null>,
  ready: boolean,
  size: Size | undefined,
  lines: Lines,
  selectedId: string | undefined,
  state: Evaluation['state'] | undefined,
) {
  const reduceMotion = useReduceMotion();
  const shown = useRef<CameraView | undefined>(undefined);
  // A move that tilts, held in state so the map allows pitch before its first step is sent.
  const [flight, setFlight] = useState<CameraStep[]>();

  useEffect(() => {
    if (!ready || !size) return;
    const view = { routes: lines, selectedId, state, size };
    const move = cameraMove(shown.current, view);
    shown.current = view;
    if (!move) return;
    const points = move === 'all' ? [...lines.values()].flatMap((l) => l.coords) : (lines.get(selectedId ?? '')?.coords ?? []);
    if (points.length === 0) return;
    const steps = cameraSteps(move, fitRegion(points, size, PADDING), reduceMotion);
    if (steps.some((s) => 'camera' in s && s.camera.pitch)) {
      setFlight(steps);
      return;
    }
    setFlight(undefined); // a new move takes over from a flight still going
    for (const step of steps) play(map.current, step);
  }, [map, ready, size, lines, selectedId, state, reduceMotion]);

  useEffect(() => {
    if (!flight) return;
    const timers = flight.map((step) => setTimeout(() => play(map.current, step), step.at));
    // Apple Maps keeps its own time for a camera move, so the pitch stays allowed a moment past the last step.
    timers.push(setTimeout(() => setFlight(undefined), moveEnd(flight) + theme.motion.duration.base));
    return () => timers.forEach(clearTimeout);
  }, [map, flight]);

  return flight !== undefined;
}

function play(map: MapView | null, step: CameraStep) {
  if (!map) return;
  if ('region' in step) map.animateToRegion(step.region, step.duration);
  else map.animateCamera(step.camera, { duration: step.duration });
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

const FADE = 48; // the height of that fade

/** The map meets the black screen in a soft fade, as in the design. Touches go through it to the map. */
function MapFade() {
  return (
    <LinearGradient
      testID="map-fade"
      pointerEvents="none"
      colors={[withAlpha(color.bg, 0), color.bg]}
      style={styles.fade}
    />
  );
}

const styles = StyleSheet.create({
  map: { height: 250, backgroundColor: color.mapBg },
  noMap: { ...theme.type.meta, color: color.textMuted, textAlign: 'center', marginTop: 150, paddingHorizontal: 32 },
  controls: { position: 'absolute', left: theme.space.screen, right: theme.space.screen },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: FADE },
});
