# Fika design

Mockups: https://claude.ai/artifact/ACWoARzcKHbdC6Zz7UAY15 (six screens: Today on time / at risk / late, late notice sheet, commute setup, Demo mode sheet).

Dark only. Pure black ground, one raised grey surface, one orange accent. State colour appears only in the state pill, the hero number, and route deltas — never on buttons.

## Tokens

```ts
export const theme = {
  color: {
    bg: '#000000',
    surface: '#1B1B1D',        // cards, bottom sheets
    surfaceRaised: '#252527',  // cards inside a sheet, text area
    control: '#2A2A2D',        // chips, round buttons inside a sheet
    segmentOn: '#5A5A60',      // selected segment
    hairline: 'rgba(255,255,255,0.07)',
    border: 'rgba(255,255,255,0.12)',
    text: '#FFFFFF',
    textMuted: '#A1A1A6',
    accent: '#F28C38',
    onAccent: '#1A0F04',       // dark text on orange; white fails contrast
    accentTint: '#3A2410',     // "Best" tag bg, with text #F9A45C
    onTime: '#4CC38A',  onTimeTint: '#12261C',
    atRisk: '#F2C94C',  atRiskTint: '#2B2410',
    late: '#FF6B5E',    lateTint: '#2E1614',
    simBanner: '#FFFFFF',      // SIMULATED TRAFFIC strip, black text
    mapBg: '#0C0E11', mapRoad: '#1A1E25', routeIdle: '#55555C',
  },
  radius: { card: 22, sheet: 32, field: 18, pill: 999 },
  space: { screen: 16, heroInset: 20, cardPad: 16, gap: 14 },
  size: { button: 56, buttonSecondary: 50, roundButton: 44, row: 54, routeRow: 58 },
  font: { family: 'Figtree' }, // @expo-google-fonts/figtree, weights 400 500 600 700 800
  type: {
    hero: { size: 64, weight: '800', letterSpacing: -2 },   // leave-by / ETA
    title: { size: 32, weight: '800' },
    decision: { size: 16, weight: '500', lineHeight: 22 },
    body: { size: 16, weight: '400' },
    rowTitle: { size: 16, weight: '600' },
    note: { size: 14, lineHeight: 20 },                       // muted
    meta: { size: 13 },                                       // muted
    button: { size: 17, weight: '700' },
  },
};
```

## Today screen, top to bottom

1. Map, 250 pt, full bleed, fades to black. Selected route orange 5 pt, others grey 4 pt. Floating 44 pt round buttons: edit commute (left), Demo + refresh pill (right).
2. SIMULATED TRAFFIC strip (30 pt, white, black caps) directly under the map, only when the engine's simulation flag is on.
3. Hero: state pill + commute summary; label ("Leave by" / "Leave" / "Arriving") over the 64 pt number; right-aligned countdown and arrival. Number takes the state colour in at risk and late.
4. Decision line (white, Claude's words), conditions note (muted).
5. Routes card: radio rows, name + "Best" tag, duration and traffic delay, arrival time and delta coloured by state. In late, this card becomes the notice preview.
6. One primary button per state: Remind me at 7:55 / Switch to <route> / Review and send notice. Below it: "Updated h:mm" and "Open in Google Maps".

## Sheets

Bottom sheets over a dimmed screen: 32 pt top radius, close button top left, segmented control centred. Notice sheet: tone segment (Manager/Friend), language chips, To row + editable text, locked fact chips (ETA, lateness), Send on WhatsApp primary, SMS and Share secondary. Destructive or reset actions are centred red text at the sheet foot.
