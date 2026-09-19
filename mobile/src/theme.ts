// Design tokens from design/DESIGN.md. Dark only.
import type { TextStyle } from 'react-native';

// Each Figtree weight is its own font family in React Native, loaded in app/_layout.tsx.
const font = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  extrabold: 'Figtree_800ExtraBold',
} as const;

const color = {
  bg: '#000000',
  surface: '#1B1B1D', // cards, bottom sheets
  surfaceRaised: '#252527', // cards inside a sheet, text area
  control: '#2A2A2D', // chips, round buttons inside a sheet
  controlRaised: '#38383B', // round buttons on a raised card: the Demo mode clock steps
  switchOff: '#48484C', // switch track when off
  segmentOn: '#5A5A60', // selected segment
  hairline: 'rgba(255,255,255,0.07)',
  scrim: 'rgba(0,0,0,0.72)', // behind a bottom sheet: the screen shows through at about 0.28
  border: 'rgba(255,255,255,0.12)',
  text: '#FFFFFF',
  textBody: '#E4E4E8', // body text on cards
  textMuted: '#A1A1A6',
  textChip: '#D6D6DB', // locked ETA and lateness chips
  radioIdle: '#6A6A70',
  accent: '#F28C38',
  onAccent: '#1A0F04', // dark text on orange; white fails contrast
  accentTint: '#3A2410', // "Best" tag background
  onAccentTint: '#F9A45C', // "Best" tag text
  onTime: '#4CC38A',
  onTimeTint: '#12261C',
  atRisk: '#F2C94C',
  atRiskTint: '#2B2410',
  late: '#FF6B5E',
  lateTint: '#2E1614',
  simBanner: '#FFFFFF', // SIMULATED TRAFFIC strip
  onSimBanner: '#000000',
  mapBg: '#0C0E11',
  mapRoad: '#1A1E25',
  routeIdle: '#55555C',
} as const;

// Ready-to-spread text styles.
const type = {
  hero: { fontFamily: font.extrabold, fontSize: 64, lineHeight: 64, letterSpacing: -2 },
  heroLabel: { fontFamily: font.semibold, fontSize: 14 }, // "Leave by" over the hero time
  heroAside: { fontFamily: font.bold, fontSize: 16 }, // "in 25 min" beside it
  status: { fontFamily: font.bold, fontSize: 14 }, // status pill
  callout: { fontFamily: font.semibold, fontSize: 15 }, // "It's past your 8:05 leave-by.
  title: { fontFamily: font.extrabold, fontSize: 32 },
  sheetTitle: { fontFamily: font.bold, fontSize: 20 },
  clock: { fontFamily: font.bold, fontSize: 18 }, // Demo mode app clock
  banner: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.96 }, // SIMULATED TRAFFIC, 0.08em
  decision: { fontFamily: font.medium, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: font.regular, fontSize: 16 },
  rowTitle: { fontFamily: font.semibold, fontSize: 16 },
  rowTime: { fontFamily: font.bold, fontSize: 16 }, // arrival time at a row's end
  cardTitle: { fontFamily: font.bold, fontSize: 15 },
  note: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  notice: { fontFamily: font.regular, fontSize: 15, lineHeight: 22 }, // the notice preview on Today
  message: { fontFamily: font.regular, fontSize: 16, lineHeight: 23 }, // the notice being edited
  meta: { fontFamily: font.regular, fontSize: 13 },
  metaStrong: { fontFamily: font.semibold, fontSize: 13 }, // route delta
  tag: { fontFamily: font.bold, fontSize: 12 },
  button: { fontFamily: font.bold, fontSize: 17 },
  buttonSecondary: { fontFamily: font.semibold, fontSize: 16 },
} as const satisfies Record<string, TextStyle>;

export const theme = {
  color,
  font,
  type,
  radius: { card: 22, sheet: 32, field: 18, pill: 999 },
  space: { screen: 16, heroInset: 20, cardPad: 16, gap: 14 },
  size: { button: 56, buttonSecondary: 50, roundButton: 44, row: 54, routeRow: 58, chip: 28 },
} as const;
