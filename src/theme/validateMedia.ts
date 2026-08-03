import { exists, size } from "@tauri-apps/plugin-fs";
import {
  detectThemeMediaKind,
  themeMediaSrc,
  type ThemeMediaKind,
} from "./media";

export type ThemeMediaFailReason =
  | "empty"
  | "ext"
  | "missing"
  | "emptyFile"
  | "unreadable";

export type ThemeMediaValidation =
  | { ok: true; kind: Exclude<ThemeMediaKind, "none"> }
  | { ok: false; reason: ThemeMediaFailReason };

/** 选完媒体：扩展名、存在、非空、可解码 */
export async function validateThemeMediaPath(
  path: string
): Promise<ThemeMediaValidation> {
  const raw = path.trim();
  if (!raw) return { ok: false, reason: "empty" };

  const kind = detectThemeMediaKind(raw);
  if (kind === "none") return { ok: false, reason: "ext" };

  const looksRemote =
    raw.startsWith("http") ||
    raw.startsWith("data:") ||
    raw.startsWith("asset:") ||
    raw.startsWith("blob:");

  if (!looksRemote) {
    try {
      const ok = await exists(raw);
      if (!ok) return { ok: false, reason: "missing" };
      const bytes = await size(raw);
      if (!Number.isFinite(bytes) || bytes <= 0) {
        return { ok: false, reason: "emptyFile" };
      }
    } catch {
      return { ok: false, reason: "missing" };
    }
  }

  const src = themeMediaSrc(raw);
  if (!src) return { ok: false, reason: "unreadable" };

  const readable = await probeMediaReadable(src, kind);
  if (!readable) return { ok: false, reason: "unreadable" };

  return { ok: true, kind };
}

function probeMediaReadable(
  src: string,
  kind: Exclude<ThemeMediaKind, "none">
): Promise<boolean> {
  return new Promise((resolve) => {
    // 大文件只探 metadata / 首帧，超时当不可读
    const failTimer = window.setTimeout(() => resolve(false), 20_000);
    const done = (ok: boolean) => {
      window.clearTimeout(failTimer);
      resolve(ok);
    };

    // 让出一帧，避免选完立刻卡 UI
    requestAnimationFrame(() => {
      if (kind === "video") {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.muted = true;
        v.onloadedmetadata = () => done(true);
        v.onerror = () => done(false);
        v.src = src;
        return;
      }

      const img = new Image();
      img.decoding = "async";
      img.onload = () => done(img.naturalWidth > 0 && img.naturalHeight > 0);
      img.onerror = () => done(false);
      img.src = src;
    });
  });
}
