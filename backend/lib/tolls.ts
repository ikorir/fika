// Toll roads Fika knows (W3). The fare depends on where a car joins and leaves the road, which Fika does not know, so
// a route gets the range, lowest to highest fare. No decision logic here.
import type { Toll } from "@/lib/contract";

type TollRoad = { match: RegExp; toll: Toll };

const TOLL_ROADS: TollRoad[] = [
  {
    // Nairobi Expressway, class 3 (private car); classes 1 and 2 are two- and three-wheelers, not allowed on it.
    // Lowest KES 170 (e.g. JKIA to Eastern Bypass), highest KES 500 (Mlolongo to Westlands), in force since
    // 1 January 2024. Source: Kenya Gazette Notice No. 17419, Vol. CXXV No. 266, 19 December 2023, under the Public
    // Roads Toll Act (Cap. 407):
    // https://nairobiexpressway.ke/downloads/NAIROBI_EXPRESSWAY_RATES_GAZETTE_071223.pdf
    // Checked 2026-09-25: no revision since.
    match: /expressway/i,
    toll: { fromKes: 170, toKes: 500 },
  },
];

/** The toll range for a route labelled "via Nairobi Expressway", and undefined for a route on no toll road. */
export function tollFor(label: string): Toll | undefined {
  const road = TOLL_ROADS.find((r) => r.match.test(label));
  return road && { ...road.toll };
}
