/** ThemePackId 与 lookId 分开。 */

export const THEME_PACK_IDS = [
  "ukiyo",
  "construct",
  "arcade",
  "paper",
  "hud",
  "candy",
  "poster",
  "ink",
  "aurora",
  "crt",
  "bauhaus",
  "brass",
  "nord",
  "toon",
  "comic",
  "scifi",
  "manga",
  "pixel",
  "mecha",
  "ghibli",
  "shinkai",
  "vapor",
  "memphis",
  "brutal",
  "stained",
  "celadon",
  "noir",
  "y2k",
  "folk",
  "ice",
  "morocco",
  "india",
  "mexico",
  "egypt",
  "korea",
  "russia",
  "turkey",
  "italy",
  "brazil",
  "arabia",
  "nouveau",
  "deco",
  "swiss",
  "gothic",
  "academia",
  "dunhuang",
  "sancai",
  "papercut",
  "wabi",
  "zen",
  "thai",
  "tibet",
  "delft",
  "greece",
  "azulejo",
  "celtic",
  "viking",
  "aboriginal",
  "solarpunk",
  "lofi",
  "cottage",
  "dune",
  "aqua",
  "sakura",
] as const;

export type ThemePackId = (typeof THEME_PACK_IDS)[number];

export type ThemeStageBackdropMode = "pack" | "wallpaper";
export type ThemeWallpaperFit = "cover" | "contain";

export interface ThemeStageBackdrop {
  mode: ThemeStageBackdropMode;
  /** mode=wallpaper：本地媒体路径（图 / gif / mp4） */
  imagePath: string;
  /** 0..1 压暗 */
  dim: number;
  fit: ThemeWallpaperFit;
  /** 视频是否静音 */
  muted: boolean;
}

/** 开机时长：auto=就绪后至少 3s；media=跟视频播完（不足 3s 补足）；manual=手动秒数 */
export type ThemeBootDurationMode = "auto" | "media" | "manual";

export const BOOT_ANIM_MIN_SEC = 3;
export const BOOT_ANIM_MAX_SEC = 120;

/** 设置窗启动时的自定义闪屏媒体 */
export interface ThemeBootAnimation {
  enabled: boolean;
  mediaPath: string;
  muted: boolean;
  fit: ThemeWallpaperFit;
  durationMode: ThemeBootDurationMode;
  /** manual 模式秒数；其它模式忽略 */
  durationSec: number;
}

/** 气泡填充不透明度下限（再低字难辨） */
export const BUBBLE_OPACITY_MIN = 0.2;
export const BUBBLE_OPACITY_MAX = 1;
/** 默认约 20% 透明 */
export const BUBBLE_OPACITY_DEFAULT = 0.8;

/** 设置页视觉包 + 背景层 + 开机动画 + 气泡 */
export interface PetThemeSettings {
  style: ThemePackId;
  stageBackdrop: ThemeStageBackdrop;
  bootAnimation: ThemeBootAnimation;
  /** 对话框填充不透明度 0.2..1 */
  bubbleOpacity: number;
}

/** 喂给现有 --ui-* 与 Ant Design */
export interface ThemePackTokens {
  colorPrimary: string;
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
  antAlgorithm: "dark" | "default";
}

export interface ThemePackMeta {
  title: string;
  blurb: string;
  banner: string;
}

export interface ThemePack {
  id: ThemePackId;
  meta: ThemePackMeta;
  tokens: ThemePackTokens;
}

export function isThemePackId(value: unknown): value is ThemePackId {
  return (
    typeof value === "string" &&
    (THEME_PACK_IDS as readonly string[]).includes(value)
  );
}

export function isThemeStageBackdropMode(
  value: unknown
): value is ThemeStageBackdropMode {
  return value === "pack" || value === "wallpaper";
}

export function isThemeWallpaperFit(value: unknown): value is ThemeWallpaperFit {
  return value === "cover" || value === "contain";
}

export const DEFAULT_THEME_STAGE_BACKDROP: ThemeStageBackdrop = {
  mode: "pack",
  imagePath: "",
  dim: 0.35,
  fit: "cover",
  muted: false,
};

export const DEFAULT_THEME_BOOT_ANIMATION: ThemeBootAnimation = {
  enabled: false,
  mediaPath: "",
  muted: false,
  fit: "cover",
  durationMode: "auto",
  durationSec: BOOT_ANIM_MIN_SEC,
};

export const DEFAULT_PET_THEME_SETTINGS: PetThemeSettings = {
  style: "ukiyo",
  stageBackdrop: { ...DEFAULT_THEME_STAGE_BACKDROP },
  bootAnimation: { ...DEFAULT_THEME_BOOT_ANIMATION },
  bubbleOpacity: BUBBLE_OPACITY_DEFAULT,
};

export function isThemeBootDurationMode(
  value: unknown
): value is ThemeBootDurationMode {
  return value === "auto" || value === "media" || value === "manual";
}

export function clampBootDurationSec(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return BOOT_ANIM_MIN_SEC;
  return Math.min(
    BOOT_ANIM_MAX_SEC,
    Math.max(BOOT_ANIM_MIN_SEC, Math.round(n))
  );
}

export function clampBubbleOpacity(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return BUBBLE_OPACITY_DEFAULT;
  return Math.min(
    BUBBLE_OPACITY_MAX,
    Math.max(BUBBLE_OPACITY_MIN, Math.round(n * 100) / 100)
  );
}

export function clonePetThemeSettings(theme: PetThemeSettings): PetThemeSettings {
  return {
    style: theme.style,
    stageBackdrop: { ...theme.stageBackdrop },
    bootAnimation: { ...theme.bootAnimation },
    bubbleOpacity: theme.bubbleOpacity,
  };
}
