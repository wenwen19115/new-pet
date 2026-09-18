import { describe, expect, it } from "vitest";
import {
  chipPreviewFitScale,
  clampPreviewBoost,
  previewCombinedScale,
} from "./previewScale";
import { getCharacter } from "@/pet/characters";
import { petBodyBox, petWindowSize } from "@/pet/bridge/sizes";

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

  it("chipPreviewFitScale 随演员框短边变大", () => {
    expect(chipPreviewFitScale(0)).toBe(1);
    expect(chipPreviewFitScale(120, 0.52)).toBeCloseTo(0.52);
    expect(chipPreviewFitScale(400, 0.52)).toBeCloseTo((400 * 0.52) / 120);
    expect(chipPreviewFitScale(400)).toBeGreaterThan(chipPreviewFitScale(168));
  });

  it("各角色有预览演员框与放大上限", () => {
    for (const id of [
      "chip",
      "fig-sci",
      "toon",
      "vrm",
      "mug-cat",
    ] as const) {
      const size = getCharacter(id).size;
      expect(size.previewActor?.w).toBeGreaterThan(100);
      expect(size.previewActor?.h).toBeGreaterThan(100);
      expect(size.previewMaxBoost).toBeGreaterThan(0);
      expect(size.previewMaxBoost).toBeLessThanOrEqual(80);
    }
    const fig = getCharacter("fig-sci").size;
    const chip = getCharacter("chip").size;
    expect(fig.previewActor!.h).toBeGreaterThan(chip.previewActor!.h);
    const vrm = getCharacter("vrm").size;
    // VRM 允许滚轮放大超过 1（舞台裁切）
    expect(
      (vrm.previewBaseScale ?? 1) * (1 + (vrm.previewMaxBoost ?? 0) / 100)
    ).toBeGreaterThan(1);
  });

  it("最大 zoom 时 HWND 盖住 VRM 角色盒", () => {
    const screen = { availW: 1920, availH: 1080 };
    const zoom = 100;
    const body = petBodyBox("vrm", zoom, screen);
    const win = petWindowSize("vrm", zoom, screen);
    expect(win.w).toBeGreaterThanOrEqual(body.w);
    expect(win.h).toBeGreaterThanOrEqual(body.h);
  });
});
