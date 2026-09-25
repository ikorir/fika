# Ticket 01, repair attempt 2: large-text defects found on device

Result: both defects fixed, and the Hero summary line is capped as asked. Nothing committed.

## Changes
- `today/ActionArea.tsx`: the "Updated …" label and "Open in Google Maps" are capped at `LARGE_TEXT_CAP` (1.6). The footer
  now has `flexWrap: 'wrap'`, `columnGap: 12` and `rowGap: 6`. The link's Press has `marginLeft: 'auto'` and
  `flexShrink: 1`, so it stays on the right: beside the label, or on its own line when both don't fit. The label has
  `flexShrink: 1` and the link text `textAlign: 'right'`, so a text too long for a line wraps inside the screen
  instead of overflowing. At 1.0 both still fit on one line, and the auto margin puts them where `space-between`
  did before.
- `today/MapArea.tsx`: the ETA bubble text (one `Text`, three styles) gets `maxFontSizeMultiplier={1.2}`. Nothing else in the file changed.
- `today/Hero.tsx`: the summary line gets `maxFontSizeMultiplier={LARGE_TEXT_CAP}`. The decision line and conditions
  note are left uncapped.

## Tests (written first; both failed before the fix)
- New `today/ActionArea.test.tsx`: both footer texts carry 1.6; the link's Press has `marginLeft: 'auto'` and its
  footer row has `flexWrap: 'wrap'`.
- `today/Hero.test.tsx`: the summary line carries 1.6.
- No test for the map bubble: rendering `MapArea` would need a mock for `react-native-maps`. Check it on the device.

## Checks
- `npm test` in `mobile/`: 24 suites, 234 of 234 pass (the 232 from before plus 2 new).
- `npm run typecheck`: clean.
- D3 grep: still only `mobile/src/ui/Press.tsx:2`.

## Device re-check (coordinator)
At the largest accessibility text size, after a cold launch:
1. Footer: "Updated …" on the left, "Open in Google Maps" whole and right-aligned. The link is on the same line
   when both fit, otherwise on the line below. Nothing is clipped at the right edge.
2. Map: the ETA bubbles are at most 1.2 times their normal size, and no longer overlap each other.
3. Hero: the summary line is no longer three lines tall beside the pill.
4. Back at the default text size, the footer, map and hero match the attempt 1 screenshots.
