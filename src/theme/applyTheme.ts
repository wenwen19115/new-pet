import type { PetThemeSettings, ThemePackId, ThemeStageBackdrop } from "./types";
import { clampBubbleOpacity } from "./types";
import { getThemePack } from "./registry";
import { syncNativeWindowChrome } from "./syncNativeWindowChrome";

export function themePackCssVars(style: ThemePackId): Record<string, string> {
  const t = getThemePack(style).tokens;
  return {
    "--ui-primary": t.colorPrimary,
    "--ui-bg-0": t.bg0,
    "--ui-bg-1": t.bg1,
    "--ui-surface": t.surface,
    "--ui-surface-strong": t.surfaceStrong,
    "--ui-border": t.border,
    "--ui-text": t.text,
    "--ui-text-muted": t.textMuted,
    "--ui-text-faint": t.textFaint,
    "--ui-accent-soft": t.accentSoft,
    "--ui-scroll-thumb": t.scrollbarThumb,
    "--ui-scroll-track": t.scrollbarTrack,
    "--ui-hero-overlay": t.heroOverlay,
  };
}

/** 媒体改走 DOM 层；CSS 只保留压暗与尺寸变量 */
export function themeStageInlineStyle(
  backdrop: ThemeStageBackdrop
): Record<string, string> {
  const active =
    backdrop.mode === "wallpaper" && Boolean(backdrop.imagePath.trim());
  return {
    "--theme-wallpaper": "none",
    "--theme-wallpaper-dim": active
      ? String(Math.min(1, Math.max(0, backdrop.dim)))
      : "0",
    "--theme-wallpaper-size": backdrop.fit === "contain" ? "contain" : "cover",
  };
}

export function themeRootStyle(theme: PetThemeSettings): Record<string, string> {
  return {
    ...themePackCssVars(theme.style),
    ...themeStageInlineStyle(theme.stageBackdrop),
    "--ui-bubble-opacity": String(clampBubbleOpacity(theme.bubbleOpacity)),
  };
}

/** 同步 document 底色与无边框窗底色/边框，避免闪白 */
export function paintDocumentBackdrop(style: ThemePackId): void {
  const bg = getThemePack(style).tokens.bg0;
  document.documentElement.style.background = bg;
  document.body.style.background = bg;
  void syncNativeWindowChrome(style);
}
