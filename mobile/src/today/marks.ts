// Shapes and colours the map's markers and lines are drawn with.

/** A `#RRGGBB` token at an opacity, for halos and glows that tint the map under them. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

const at = (n: number) => +n.toFixed(2);

/**
 * An ETA bubble's outline: a `width` × `height` rounded box with a `tail` pt tail from the middle of its foot, its tip
 * at (width / 2, height + tail), where the bubble meets the road.
 */
export function bubblePath(width: number, height: number, radius: number, tail: number): string {
  const r = Math.min(radius, width / 2, height / 2);
  const w = at(width);
  const h = at(height);
  const mid = at(width / 2);
  const half = Math.min(tail, (width - 2 * r) / 2); // the tail's base, half each side, clear of the corners
  return [
    `M${at(r)} 0H${at(width - r)}`,
    `A${at(r)} ${at(r)} 0 0 1 ${w} ${at(r)}V${at(height - r)}`,
    `A${at(r)} ${at(r)} 0 0 1 ${at(width - r)} ${h}`,
    `H${at(width / 2 + half)}L${mid} ${at(height + tail)}L${at(width / 2 - half)} ${h}`,
    `H${at(r)}A${at(r)} ${at(r)} 0 0 1 0 ${at(height - r)}`,
    `V${at(r)}A${at(r)} ${at(r)} 0 0 1 ${at(r)} 0Z`,
  ].join('');
}
