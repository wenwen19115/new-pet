import { describe, expect, it } from "vitest";
import {
  clampPreviewBoost,
  previewCombinedScale,
} from "./previewScale";
import { getCharacter } from "@/pet/characters";

describe("preview fit per character", () => {
  it("clampPreviewBoost 尊重角色上限", () => {
    expect(clampPreviewBoost(99, 18)).toBe(18);
    expect(clampPreviewBoost(-3, 18)).toBe(0);
  });

  it("combinedScale = base × boost", () => {
    expect(previewCombinedScale(0.9, 0, 18)).toBeCloseTo(0.9);
    expect(previewCombinedScale(0.9, 18, 18)).toBeCloseTo(0.9 * 1.18);
    expect(previewCombinedScale(0.84, 19, 19)).toBeCloseTo(0.84 * 1.19);
  });

  it("各角色有预览演员框与放大上限", () => {
    for (const id of ["chip", "fig-sci", "toon", "vrm"] as const) {
      const size = getCharacter(id).size;
      expect(size.previewActor?.w).toBeGreaterThan(100);
      expect(size.previewActor?.h).toBeGreaterThan(100);
      expect(size.previewMaxBoost).toBeLessThanOrEqual(40);
    }
    const fig = getCharacter("fig-sci").size;
    const chip = getCharacter("chip").size;
    expect(fig.previewActor!.h).toBeGreaterThan(chip.previewActor!.h);
    // 立绘贴合上限：base×maxBoost ≤ 1，放大不裁头
    expect(
      (fig.previewBaseScale ?? 1) * (1 + (fig.previewMaxBoost ?? 0) / 100)
    ).toBeLessThanOrEqual(1.001);
  });
});
