export interface ChipPinDef {
  id: string;
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  tipX: number;
  tipY: number;
  tipW: number;
  tipH: number;
}

/** viewBox 0–100 */
export const CHIP_PINS: ChipPinDef[] = [
  { id: "t0", index: 0, x: 32, y: 7, w: 5, h: 11, tipX: 32.5, tipY: 7, tipW: 4, tipH: 3 },
  { id: "t1", index: 1, x: 47.5, y: 7, w: 5, h: 11, tipX: 48, tipY: 7, tipW: 4, tipH: 3 },
  { id: "t2", index: 2, x: 63, y: 7, w: 5, h: 11, tipX: 63.5, tipY: 7, tipW: 4, tipH: 3 },
  { id: "r0", index: 3, x: 82, y: 28, w: 11, h: 5, tipX: 90, tipY: 28.5, tipW: 3, tipH: 4 },
  { id: "r1", index: 4, x: 82, y: 40, w: 11, h: 5, tipX: 90, tipY: 40.5, tipW: 3, tipH: 4 },
  { id: "r2", index: 5, x: 82, y: 52, w: 11, h: 5, tipX: 90, tipY: 52.5, tipW: 3, tipH: 4 },
  { id: "r3", index: 6, x: 82, y: 64, w: 11, h: 5, tipX: 90, tipY: 64.5, tipW: 3, tipH: 4 },
  { id: "b2", index: 7, x: 63, y: 82, w: 5, h: 11, tipX: 63.5, tipY: 90, tipW: 4, tipH: 3 },
  { id: "b1", index: 8, x: 47.5, y: 82, w: 5, h: 11, tipX: 48, tipY: 90, tipW: 4, tipH: 3 },
  { id: "b0", index: 9, x: 32, y: 82, w: 5, h: 11, tipX: 32.5, tipY: 90, tipW: 4, tipH: 3 },
  { id: "l3", index: 10, x: 7, y: 64, w: 11, h: 5, tipX: 7, tipY: 64.5, tipW: 3, tipH: 4 },
  { id: "l2", index: 11, x: 7, y: 52, w: 11, h: 5, tipX: 7, tipY: 52.5, tipW: 3, tipH: 4 },
  { id: "l1", index: 12, x: 7, y: 40, w: 11, h: 5, tipX: 7, tipY: 40.5, tipW: 3, tipH: 4 },
  { id: "l0", index: 13, x: 7, y: 28, w: 11, h: 5, tipX: 7, tipY: 28.5, tipW: 3, tipH: 4 },
];

export function chipSideLedStyle(pinColors: string[], index: number) {
  const c = pinColors[index] ?? "#1a6b78";
  return {
    background: `linear-gradient(155deg, color-mix(in srgb, ${c} 55%, #fff) 0%, ${c} 48%, color-mix(in srgb, ${c} 65%, #000) 100%)`,
    boxShadow: `0 0 7px ${c}`,
  };
}
