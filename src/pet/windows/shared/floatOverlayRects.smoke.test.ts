import { describe, expect, it } from "vitest";
import {
  nudgeAwayFromObstacle,
  rectsOverlap,
} from "./floatOverlayRects";

describe("floatOverlayRects", () => {
  it("detects overlap with pad", () => {
    expect(
      rectsOverlap(
        { x: 0, y: 0, w: 100, h: 100 },
        { x: 90, y: 90, w: 50, h: 50 },
        0
      )
    ).toBe(true);
    expect(
      rectsOverlap(
        { x: 0, y: 0, w: 100, h: 100 },
        { x: 120, y: 0, w: 50, h: 50 },
        10
      )
    ).toBe(false);
  });

  it("nudges to the opposite side of the pet", () => {
    const place = nudgeAwayFromObstacle(
      { x: 200, y: 100 },
      { w: 220, h: 100 },
      { x: 190, y: 80, w: 228, h: 400 },
      { minX: 0, maxX: 800, minY: 0, maxY: 600 },
      {
        centerX: 150,
        bodyLeft: 100,
        bodyRight: 180,
        gap: 6,
      }
    );
    expect(
      rectsOverlap(
        { x: place.x, y: place.y, w: 220, h: 100 },
        { x: 190, y: 80, w: 228, h: 400 },
        10
      )
    ).toBe(false);
  });
});
