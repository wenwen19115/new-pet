/** App chrome theme (settings UI day/night) — separate from pet look (形象) `lookId`. */

export type AppUiTheme = "night" | "day";

export function isAppUiTheme(value: unknown): value is AppUiTheme {
  return value === "night" || value === "day";
}

interface UiThemeTokens {
  colorPrimary: string;
  /** page / app root */
  bg0: string;
  bg1: string;
  surface: string;
  surfaceStrong: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accentSoft: string;
  scrollbarThumb: string;
  scrollbarTrack: string;
  heroOverlay: string;
  /** Ant Design algorithm */
  algorithm: "dark" | "default";
}

export const UI_THEME_TOKENS: Record<AppUiTheme, UiThemeTokens> = {
  night: {
    colorPrimary: "#40c4ff",
    bg0: "#0a0a0a",
    bg1: "#16202a",
    surface: "rgba(0, 0, 0, 0.22)",
    surfaceStrong: "rgba(0, 0, 0, 0.35)",
    border: "rgba(255, 255, 255, 0.08)",
    text: "rgba(255, 255, 255, 0.9)",
    textMuted: "rgba(255, 255, 255, 0.55)",
    textFaint: "rgba(255, 255, 255, 0.45)",
    accentSoft: "rgba(64, 196, 255, 0.16)",
    scrollbarThumb: "rgba(64, 196, 255, 0.28)",
    scrollbarTrack: "rgba(255, 255, 255, 0.04)",
    heroOverlay: "rgba(16, 18, 28, 0.55)",
    algorithm: "dark",
  },
  day: {
    colorPrimary: "#2aa8e0",
    bg0: "#f4f1ea",
    bg1: "#fbf9f5",
    surface: "rgba(255, 255, 255, 0.72)",
    surfaceStrong: "rgba(255, 255, 255, 0.88)",
    border: "rgba(40, 36, 32, 0.1)",
    text: "rgba(36, 32, 28, 0.92)",
    textMuted: "rgba(36, 32, 28, 0.58)",
    textFaint: "rgba(36, 32, 28, 0.45)",
    accentSoft: "rgba(42, 168, 224, 0.14)",
    scrollbarThumb: "rgba(42, 168, 224, 0.35)",
    scrollbarTrack: "rgba(40, 36, 32, 0.06)",
    heroOverlay: "rgba(250, 248, 244, 0.42)",
    algorithm: "default",
  },
};

export function uiThemeCssVars(theme: AppUiTheme): Record<string, string> {
  const t = UI_THEME_TOKENS[theme];
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
