import type { PetToonDecorId } from "../../skins/looks";
import type { ToonPix } from "./types";

/** 主题专属装饰：水晶 / 灯笼 / 花 / 星月 */
export function buildToonDecorPixels(
  decor: PetToonDecorId | null | undefined,
  accent: string,
  accentSoft: string
): ToonPix[] {
  const a = accent;
  const s = accentSoft;
  const o = "#141820";
  switch (decor) {
    case "crystal":
      return [
        { x: 19, y: 4, fill: o },
        { x: 20, y: 4, fill: a },
        { x: 21, y: 4, fill: o },
        { x: 19, y: 5, fill: a },
        { x: 20, y: 5, fill: s },
        { x: 21, y: 5, fill: a },
        { x: 20, y: 6, fill: a },
      ];
    case "lantern":
      return [
        { x: 8, y: 18, fill: o },
        { x: 7, y: 19, fill: a },
        { x: 8, y: 19, fill: s },
        { x: 9, y: 19, fill: a },
        { x: 7, y: 20, fill: a },
        { x: 8, y: 20, fill: s },
        { x: 9, y: 20, fill: a },
        { x: 8, y: 21, fill: o },
      ];
    case "blossom":
      return [
        { x: 12, y: 9, fill: a, opacity: 0.9 },
        { x: 11, y: 10, fill: s },
        { x: 12, y: 10, fill: a },
        { x: 13, y: 10, fill: s },
        { x: 12, y: 11, fill: a },
        { x: 28, y: 9, fill: s, opacity: 0.85 },
        { x: 27, y: 10, fill: a },
        { x: 28, y: 10, fill: s },
        { x: 29, y: 10, fill: a },
      ];
    case "star":
      return [
        { x: 19, y: 3, fill: s },
        { x: 20, y: 2, fill: a },
        { x: 21, y: 3, fill: s },
        { x: 20, y: 4, fill: a },
        { x: 32, y: 8, fill: s, opacity: 0.8 },
        { x: 33, y: 9, fill: a, opacity: 0.7 },
        { x: 6, y: 9, fill: s, opacity: 0.65 },
      ];
    default:
      return [];
  }
}
