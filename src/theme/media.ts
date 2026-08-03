import { convertFileSrc } from "@tauri-apps/api/core";

export type ThemeMediaKind = "none" | "image" | "gif" | "video";

export const THEME_MEDIA_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "mp4",
  "webm",
] as const;

const VIDEO_EXT = new Set(["mp4", "webm"]);
const GIF_EXT = new Set(["gif"]);
const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

function themeMediaExt(path: string): string {
  const base = path.trim().split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot < 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function detectThemeMediaKind(path: string): ThemeMediaKind {
  const ext = themeMediaExt(path);
  if (!ext) return "none";
  if (VIDEO_EXT.has(ext)) return "video";
  if (GIF_EXT.has(ext)) return "gif";
  if (IMAGE_EXT.has(ext)) return "image";
  return "none";
}

/** 本地路径 / 已有 URL → WebView 可加载 src */
export function themeMediaSrc(path: string): string {
  const raw = path.trim();
  if (!raw) return "";
  if (
    raw.startsWith("http") ||
    raw.startsWith("data:") ||
    raw.startsWith("asset:") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }
  try {
    return convertFileSrc(raw);
  } catch {
    const url = raw.replace(/\\/g, "/");
    return url.startsWith("file:")
      ? url
      : `file:///${url.replace(/^\/+/, "")}`;
  }
}
