import type { ToonPalette, ToonPix } from "./types";

export function buildToonEarPixels(p: ToonPalette): ToonPix[] {
  const o = (x: number, y: number): ToonPix => ({ x, y, fill: p.outline });
  const e = (x: number, y: number): ToonPix => ({ x, y, fill: p.ear });
  const ei = (x: number, y: number): ToonPix => ({ x, y, fill: p.earIn });
  const f = (x: number, y: number): ToonPix => ({ x, y, fill: p.fur });
  return [
    // 左耳
    o(13, 8),
    o(14, 7),
    o(15, 6),
    e(14, 8),
    e(15, 7),
    ei(15, 8),
    f(15, 9),
    o(16, 7),
    o(16, 8),
    // 右耳
    o(24, 8),
    o(25, 7),
    o(26, 6),
    e(25, 8),
    e(26, 7),
    ei(26, 8),
    f(26, 9),
    o(27, 7),
    o(27, 8),
  ];
}

export function buildToonBodyPixels(p: ToonPalette): ToonPix[] {
  const o = (x: number, y: number): ToonPix => ({ x, y, fill: p.outline });
  const f = (x: number, y: number): ToonPix => ({ x, y, fill: p.fur });
  const d = (x: number, y: number): ToonPix => ({ x, y, fill: p.furD });
  const l = (x: number, y: number): ToonPix => ({ x, y, fill: p.furL });
  const b = (x: number, y: number): ToonPix => ({ x, y, fill: p.belly });
  const n = (x: number, y: number): ToonPix => ({ x, y, fill: p.nose });
  const ck = (x: number, y: number): ToonPix => ({ x, y, fill: p.cheek });

  const head: ToonPix[] = [];
  // 头顶到下颌
  for (let x = 15; x <= 26; x++) head.push(o(x, 10));
  for (let y = 11; y <= 15; y++) {
    head.push(o(14, y), o(27, y));
    for (let x = 15; x <= 26; x++) {
      if (y === 11 && (x === 15 || x === 26)) head.push(l(x, y));
      else if (y >= 13 && y <= 14 && (x === 16 || x === 25)) head.push(ck(x, y));
      else head.push(f(x, y));
    }
  }
  // 眼窝留白区由 SVG eyes 覆盖，这里填毛色底
  head.push(
    o(15, 16),
    f(16, 16),
    f(17, 16),
    f(18, 16),
    f(19, 16),
    f(20, 16),
    f(21, 16),
    f(22, 16),
    f(23, 16),
    f(24, 16),
    f(25, 16),
    o(26, 16),
    o(16, 17),
    f(17, 17),
    f(18, 17),
    n(19, 17),
    n(20, 17),
    n(21, 17),
    f(22, 17),
    f(23, 17),
    o(24, 17),
    o(17, 18),
    b(18, 18),
    b(19, 18),
    b(20, 18),
    b(21, 18),
    b(22, 18),
    o(23, 18)
  );

  const torso: ToonPix[] = [
    o(16, 19),
    d(17, 19),
    f(18, 19),
    b(19, 19),
    b(20, 19),
    b(21, 19),
    f(22, 19),
    d(23, 19),
    o(24, 19),
    o(15, 20),
    d(16, 20),
    f(17, 20),
    b(18, 20),
    b(19, 20),
    b(20, 20),
    b(21, 20),
    b(22, 20),
    f(23, 20),
    d(24, 20),
    o(25, 20),
    o(15, 21),
    d(16, 21),
    f(17, 21),
    b(18, 21),
    b(19, 21),
    b(20, 21),
    b(21, 21),
    b(22, 21),
    f(23, 21),
    d(24, 21),
    o(25, 21),
    o(15, 22),
    d(16, 22),
    f(17, 22),
    b(18, 22),
    b(19, 22),
    b(20, 22),
    b(21, 22),
    b(22, 22),
    f(23, 22),
    d(24, 22),
    o(25, 22),
    o(16, 23),
    f(17, 23),
    f(18, 23),
    b(19, 23),
    b(20, 23),
    b(21, 23),
    f(22, 23),
    f(23, 23),
    o(24, 23),
    // 前爪
    o(16, 24),
    d(16, 25),
    o(16, 26),
    o(17, 26),
    o(23, 24),
    d(24, 25),
    o(24, 26),
    o(25, 26),
    // 后腿
    o(18, 24),
    d(18, 25),
    o(18, 26),
    o(19, 26),
    o(21, 24),
    d(22, 25),
    o(22, 26),
    o(23, 26),
  ];

  return [...head, ...torso];
}

export function buildToonTailPixels(p: ToonPalette): ToonPix[] {
  const o = (x: number, y: number): ToonPix => ({ x, y, fill: p.outline });
  const d = (x: number, y: number): ToonPix => ({ x, y, fill: p.furD });
  const e = (x: number, y: number): ToonPix => ({ x, y, fill: p.ear });
  const ei = (x: number, y: number): ToonPix => ({ x, y, fill: p.earIn });
  return [
    o(25, 19),
    d(26, 18),
    d(27, 17),
    e(28, 16),
    e(29, 15),
    ei(29, 16),
    e(30, 15),
    ei(30, 16),
    e(31, 16),
    o(31, 15),
    o(32, 16),
    e(31, 17),
    e(30, 17),
    o(29, 17),
    o(28, 18),
    d(27, 19),
  ];
}
