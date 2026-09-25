# Ticket 04, repair attempt 2: the ETA bubbles show their text again

Result: fixed in `mobile/src/today/MapMarkers.tsx`, with tests in `MapArea.test.tsx`. Nothing is committed.

## Cause
The bubble's shape covered its text. `tracksViewChanges` is not the cause: Apple Maps markers ignore it, and nothing
under `ios/AirMaps` reads it. What happened:
- `AIRMapMarker insertReactSubview:atIndex:` calls `[self addSubview:]`, so every view mounted into a marker goes on
  top, whatever its index.
- Fabric flattens views that only do layout. The bubble's outer view has only `paddingBottom`, and its label box has
  only padding, so the Svg and the Text were mounted straight into the marker.
- The Svg was rendered only after `onLayout`. It arrived after the Text, landed on top, and hid the text. The shape
  still showed.

## Fix
- `EtaBubble`'s root view is `collapsable={false}`, so the marker holds one real view, and its children keep their
  order through `insertSubview:atIndex:`.
- The Svg is mounted from the first frame at 0×0, and the path is drawn once the label is measured, so the shape is
  always below the text.
- The pin halo and the incident box are also `collapsable={false}`, so every marker body is one stable view.
- Text, colours, the 1.2 cap, anchors and `tracksViewChanges` are unchanged.

## Tests (2 new)
- Each ETA marker contains its "N min" text, with the shape before the text: on first render, after layout, and
  after tracking turns off.
- Every marker (origin, destination, two bubbles, incident) has exactly one `collapsable={false}` body. The pin halos
  and rings and the incident pulse still render.
- Red check: with `collapsable={false}` removed, the marker-body test fails.

## Checks (2026-09-25)
- `npm test`: 38 suites, 377 of 377 pass.
- `npm run typecheck`: clean.
- React Compiler: all MapMarkers components compile.

## Device check (coordinator)
1. Relaunch the app so the JS reloads; no rebuild is needed. The bubbles show "N min" on first render.
2. Tap each route, turn on the demo accident, and tap Switch. The text stays in every bubble.
3. Check that the pins' halos and the incident marker and its pulse still look as they did in attempt 1.
