/** 设置预览滚轮缩放（纯计算，不进 bridge） */

export function clampPreviewBoost(value: number, max = 40): number {
  if (Number.isNaN(value)) return 0;
  const hi = Math.max(0, Math.round(max));
  return Math.min(hi, Math.max(0, Math.round(value)));
}

export function previewBoostScale(boostPercent: number, max = 40): number {
  return 1 + clampPreviewBoost(boostPercent, max) / 100;
}

/** 最终缩放 = 角色起始倍率 × 滚轮 boost */
export function previewCombinedScale(
  baseScale: number,
  boostPercent: number,
  maxBoost = 40
): number {
  const base =
    Number.isFinite(baseScale) && baseScale > 0 ? baseScale : 1;
  return base * previewBoostScale(boostPercent, maxBoost);
}

/** chip 设计稿边长（.orbit-rig） */
const CHIP_PREVIEW_DESIGN_PX = 120;

/**
 * 芯片预览贴合演员框：把 120px 设计稿放大到 pad 短边的 fill 比例。
 * 不用 CSS `scale: calc(cqmin/…)`——WebView 里常被丢掉。
 * fill 不宜过高：芯片是方块+引脚，0.9 会盖住大半窗景。
 */
export function chipPreviewFitScale(
  padMinSidePx: number,
  fill = 0.52,
  designPx = CHIP_PREVIEW_DESIGN_PX
): number {
  if (!(padMinSidePx > 0) || !(designPx > 0)) return 1;
  const f = Number.isFinite(fill) && fill > 0 ? fill : 0.52;
  return (padMinSidePx * f) / designPx;
}
