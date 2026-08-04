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
