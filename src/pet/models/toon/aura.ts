import type { ToonFloatParticle, ToonPix } from "./types";

/** 身后呼吸光晕（贴体淡光，整组呼吸） */
export function buildToonBreathPixels(
  accent: string,
  accentSoft: string
): ToonPix[] {
  const a = accent;
  const s = accentSoft;
  return [
    { x: 15, y: 12, fill: s, opacity: 0.28 },
    { x: 16, y: 11, fill: a, opacity: 0.22 },
    { x: 17, y: 10, fill: s, opacity: 0.16 },
    { x: 22, y: 10, fill: s, opacity: 0.16 },
    { x: 23, y: 11, fill: a, opacity: 0.22 },
    { x: 24, y: 12, fill: s, opacity: 0.28 },
    { x: 14, y: 15, fill: a, opacity: 0.16 },
    { x: 14, y: 16, fill: s, opacity: 0.2 },
    { x: 25, y: 15, fill: a, opacity: 0.16 },
    { x: 25, y: 16, fill: s, opacity: 0.2 },
    { x: 15, y: 20, fill: a, opacity: 0.18 },
    { x: 24, y: 20, fill: a, opacity: 0.18 },
    { x: 16, y: 21, fill: s, opacity: 0.14 },
    { x: 23, y: 21, fill: s, opacity: 0.14 },
    { x: 19, y: 9, fill: s, opacity: 0.25 },
    { x: 20, y: 9, fill: a, opacity: 0.2 },
    { x: 18, y: 22, fill: s, opacity: 0.12 },
    { x: 21, y: 22, fill: a, opacity: 0.12 },
  ];
}

/** 漂浮粒子：错峰出现/上浮/漂移/消失；含单点与小十字星 */
export function buildToonFloatParticles(
  accent: string,
  accentSoft: string
): ToonFloatParticle[] {
  const a = accent;
  const s = accentSoft;
  const hi = "#f2ffff";
  const cross = (x: number, y: number, fill: string, o = 0.85): ToonPix[] => [
    { x, y, fill, opacity: o },
    { x: x - 1, y, fill, opacity: o * 0.55 },
    { x: x + 1, y, fill, opacity: o * 0.55 },
    { x, y: y - 1, fill, opacity: o * 0.55 },
    { x, y: y + 1, fill, opacity: o * 0.55 },
  ];
  const dot = (x: number, y: number, fill: string, o = 0.8): ToonPix[] => [
    { x, y, fill, opacity: o },
  ];

  return [
    { delay: "0s", dur: "2.6s", rise: "-4px", drift: "1px", cells: cross(17, 7, hi, 0.9) },
    { delay: "0.35s", dur: "2.9s", rise: "-5px", drift: "-1.5px", cells: dot(23, 6, a, 0.85) },
    { delay: "0.7s", dur: "2.4s", rise: "-3px", drift: "2px", cells: dot(12, 10, s, 0.75) },
    { delay: "1.1s", dur: "3.1s", rise: "-6px", drift: "-1px", cells: cross(27, 9, a, 0.8) },
    { delay: "0.2s", dur: "2.7s", rise: "-4px", drift: "1.5px", cells: dot(8, 14, s, 0.7) },
    { delay: "1.4s", dur: "2.5s", rise: "-5px", drift: "-2px", cells: dot(31, 13, a, 0.7) },
    { delay: "0.55s", dur: "3.2s", rise: "-3px", drift: "0.5px", cells: cross(20, 5, s, 0.75) },
    { delay: "1.8s", dur: "2.8s", rise: "-4px", drift: "-1px", cells: dot(14, 8, a, 0.65) },
    { delay: "0.9s", dur: "2.3s", rise: "-5px", drift: "2px", cells: dot(26, 7, hi, 0.7) },
    { delay: "2.0s", dur: "3.0s", rise: "-3px", drift: "-0.5px", cells: dot(10, 18, s, 0.55) },
    { delay: "1.25s", dur: "2.6s", rise: "-4px", drift: "1px", cells: dot(29, 17, a, 0.55) },
    { delay: "0.15s", dur: "2.2s", rise: "-6px", drift: "-1.5px", cells: cross(22, 4, a, 0.7) },
    { delay: "1.6s", dur: "2.9s", rise: "-3px", drift: "2.5px", cells: dot(6, 11, hi, 0.5) },
    { delay: "2.2s", dur: "2.5s", rise: "-5px", drift: "-2px", cells: dot(33, 15, s, 0.5) },
    { delay: "0.45s", dur: "3.4s", rise: "-7px", drift: "1px", cells: cross(15, 5, s, 0.65) },
    { delay: "2.4s", dur: "2.7s", rise: "-4px", drift: "-1px", cells: dot(18, 6, a, 0.6) },
    { delay: "1.05s", dur: "2.1s", rise: "-5px", drift: "1.5px", cells: dot(25, 12, hi, 0.55) },
    { delay: "2.6s", dur: "3.3s", rise: "-3px", drift: "-2px", cells: dot(11, 13, a, 0.5) },
  ];
}
