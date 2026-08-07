import { describe, expect, it } from "vitest";
import { buildToonHitMask, testToonHitMask } from "@/pet/models/toon/toonHit";
import { testChipHit } from "@/pet/models/chip/chipHit";
import {
  testFigAlphaHit,
  type FigAlphaMap,
} from "@/pet/models/fig-sci/figHit";
import {
  registerPetHitTester,
  testPetPreciseHit,
} from "@/pet/runtime/petHitBridge";

describe("petHitBridge", () => {
  it("returns null without tester; respects register/clear", () => {
    registerPetHitTester(null);
    expect(testPetPreciseHit(0, 0)).toBeNull();
    registerPetHitTester((x, y) => x * x + y * y < 0.25);
    expect(testPetPreciseHit(0, 0)).toBe(true);
    expect(testPetPreciseHit(0.9, 0.9)).toBe(false);
    expect(testPetPreciseHit(2, 0)).toBe(false);
    registerPetHitTester(null);
    expect(testPetPreciseHit(0, 0)).toBeNull();
  });
});

describe("toonHit", () => {
  it("hits occupied cells and misses empty corners", () => {
    const mask = buildToonHitMask([[{ x: 20, y: 20 }]]);
    expect(testToonHitMask(mask, 0, 0)).toBe(true);
    expect(testToonHitMask(mask, -0.95, 0.95)).toBe(false);
    // 邻格经 1px 膨胀也可点（格子 19,20 → NDC 约 -0.025）
    expect(testToonHitMask(mask, (19.5 / 40) * 2 - 1, 0)).toBe(true);
  });
});

describe("chipHit", () => {
  it("center hits, far corners miss", () => {
    expect(testChipHit(0, 0)).toBe(true);
    expect(testChipHit(0.5, 0.2)).toBe(true);
    expect(testChipHit(0.95, 0.95)).toBe(false);
  });
});

describe("figHit", () => {
  it("samples opaque center and rejects clear corners", () => {
    const w = 4;
    const h = 4;
    const alpha = new Uint8Array(w * h);
    for (const [x, y] of [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
    ] as const) {
      alpha[y * w + x] = 255;
    }
    const map: FigAlphaMap = { w, h, alpha };
    expect(testFigAlphaHit(map, 0, 0, 2 / 3)).toBe(true);
    expect(testFigAlphaHit(map, -0.95, 0.95, 2 / 3)).toBe(false);
  });
});
