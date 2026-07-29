import type { ToonPix } from "./types";

/** 头顶虫洞椭圆（自上而下掉出） */
export function buildToonPortalPixels(
  accent: string,
  accentSoft: string
): ToonPix[] {
  const a = accent;
  const s = accentSoft;
  const core = "#0a1020";
  return [
    // 外环（偏上）
    { x: 12, y: 5, fill: a, opacity: 0.55 },
    { x: 13, y: 4, fill: s, opacity: 0.7 },
    { x: 14, y: 4, fill: a, opacity: 0.8 },
    { x: 15, y: 3, fill: s },
    { x: 16, y: 3, fill: a },
    { x: 17, y: 3, fill: s },
    { x: 18, y: 3, fill: a },
    { x: 19, y: 3, fill: s },
    { x: 20, y: 3, fill: a },
    { x: 21, y: 3, fill: s },
    { x: 22, y: 3, fill: a },
    { x: 23, y: 3, fill: s },
    { x: 24, y: 3, fill: a },
    { x: 25, y: 4, fill: s, opacity: 0.8 },
    { x: 26, y: 4, fill: a, opacity: 0.7 },
    { x: 27, y: 5, fill: s, opacity: 0.55 },
    // 内圈黑洞
    { x: 14, y: 5, fill: a, opacity: 0.45 },
    { x: 15, y: 5, fill: core },
    { x: 16, y: 4, fill: core },
    { x: 17, y: 4, fill: core },
    { x: 18, y: 4, fill: "#122038" },
    { x: 19, y: 4, fill: core },
    { x: 20, y: 4, fill: "#122038" },
    { x: 21, y: 4, fill: core },
    { x: 22, y: 4, fill: core },
    { x: 23, y: 4, fill: core },
    { x: 24, y: 5, fill: a, opacity: 0.45 },
    { x: 16, y: 5, fill: a, opacity: 0.35 },
    { x: 17, y: 5, fill: s, opacity: 0.4 },
    { x: 18, y: 5, fill: a, opacity: 0.5 },
    { x: 19, y: 5, fill: s, opacity: 0.55 },
    { x: 20, y: 5, fill: a, opacity: 0.5 },
    { x: 21, y: 5, fill: s, opacity: 0.4 },
    { x: 22, y: 5, fill: a, opacity: 0.35 },
    // 上缘光晕
    { x: 17, y: 2, fill: s, opacity: 0.45 },
    { x: 18, y: 2, fill: a, opacity: 0.55 },
    { x: 19, y: 2, fill: s, opacity: 0.65 },
    { x: 20, y: 2, fill: a, opacity: 0.55 },
    { x: 21, y: 2, fill: s, opacity: 0.45 },
    { x: 18, y: 1, fill: a, opacity: 0.35 },
    { x: 19, y: 1, fill: s, opacity: 0.4 },
    { x: 20, y: 1, fill: a, opacity: 0.35 },
  ];
}
