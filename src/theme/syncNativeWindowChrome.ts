import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow, type Theme } from "@tauri-apps/api/window";
import { setWindowBorderColor } from "@/pet/bridge/windowChrome";
import { getThemePack } from "./registry";
import type { ThemePackId } from "./types";

function parseHexRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const u = Math.min(1, Math.max(0, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u),
  ];
}

/** 同步窗底色/边框；可见标题栏走 ThemeTitleBar。 */
export async function syncNativeWindowChrome(style: ThemePackId): Promise<void> {
  try {
    const tokens = getThemePack(style).tokens;
    const dark = tokens.antAlgorithm === "dark";
    const win = getCurrentWindow();
    await win.setTheme(dark ? ("dark" as Theme) : ("light" as Theme));
    try {
      await win.setShadow(true);
    } catch {
      /* 部分环境无 shadow */
    }

    const bg = parseHexRgb(tokens.bg0);
    const primary = parseHexRgb(tokens.colorPrimary);
    if (!bg) return;

    // 底色掺主色，启动边不至于死黑死白
    const tint = primary ? mixRgb(bg, primary, dark ? 0.28 : 0.22) : bg;

    try {
      await setWindowBorderColor({ border: tint, dark });
    } catch {
      /* 非 Windows / 无权限 */
    }

    await win.setBackgroundColor(tint);
    try {
      await getCurrentWebview().setBackgroundColor([
        tint[0],
        tint[1],
        tint[2],
        255,
      ]);
    } catch {
      /* ignore */
    }
  } catch {
    /* 非 Tauri / 子窗 */
  }
}
