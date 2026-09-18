import { describe, expect, it } from "vitest";
import {
  buildEdgeCrawlWaypoints,
  projectOntoNearestEdge,
  type WorkRect,
} from "./screenFly";

const RECT: WorkRect = { left: 0, top: 0, right: 1000, bottom: 600 };

describe("edge crawl waypoints", () => {
  it("projects interior point onto a work-area edge", () => {
    const p = projectOntoNearestEdge(RECT, 400, 10);
    expect(p.edge).toBe("top");
    expect(p.y).toBe(0);
    expect(p.x).toBe(400);
  });

  it("builds a polyline that stays on the rect border", () => {
    const pts = buildEdgeCrawlWaypoints(
      RECT,
      { x: 200, y: 300 },
      3,
      () => 0.42
    );
    expect(pts.length).toBeGreaterThanOrEqual(2);
    for (const p of pts) {
      const onH = p.y === RECT.top || p.y === RECT.bottom;
      const onV = p.x === RECT.left || p.x === RECT.right;
      expect(onH || onV).toBe(true);
      expect(p.x).toBeGreaterThanOrEqual(RECT.left);
      expect(p.x).toBeLessThanOrEqual(RECT.right);
      expect(p.y).toBeGreaterThanOrEqual(RECT.top);
      expect(p.y).toBeLessThanOrEqual(RECT.bottom);
    }
  });
});
