import type { ThemePackId } from "./types";
import { THEME_PACK_IDS } from "./types";
import { getThemePack } from "./registry";

export type ThemeControlShape = {
  radius: string;
  radiusSm: string;
  panelRadius: string;
  antRadius: number;
  elevShadow: string;
};

function parsePx(raw: string): number | null {
  const m = /^(\d+)px$/.exec(raw.trim());
  return m ? Number(m[1]) : null;
}

/** 由 tokens.controlRadius 推导通用控件外形 */
export function resolveThemeControlShape(btnRadius: string): ThemeControlShape {
  const raw = btnRadius.trim() || "10px";
  const hardShadow =
    "4px 4px 0 color-mix(in srgb, var(--ui-primary) 50%, #000)";
  const softShadow = "0 12px 32px rgba(0, 0, 0, 0.28)";

  if (raw === "0") {
    return {
      radius: "0",
      radiusSm: "0",
      panelRadius: "0",
      antRadius: 0,
      elevShadow: hardShadow,
    };
  }

  const px = parsePx(raw);
  if (px != null && px >= 999) {
    return {
      radius: "999px",
      radiusSm: "999px",
      panelRadius: "16px",
      antRadius: 16,
      elevShadow: softShadow,
    };
  }

  if (px != null) {
    return {
      radius: `${px}px`,
      radiusSm: `${Math.min(px, 8)}px`,
      panelRadius: `${px}px`,
      antRadius: px,
      elevShadow: softShadow,
    };
  }

  // 异形圆角（百分比 / 多值）：按钮跟 pack，面板用温和圆角
  return {
    radius: raw,
    radiusSm: raw,
    panelRadius: "12px",
    antRadius: 8,
    elevShadow: softShadow,
  };
}

export function getThemeControlShape(style: ThemePackId): ThemeControlShape {
  return resolveThemeControlShape(getThemePack(style).tokens.controlRadius);
}

export function themeControlShapeCssVars(
  style: ThemePackId
): Record<string, string> {
  const s = getThemeControlShape(style);
  return {
    "--ui-radius": s.radius,
    "--ui-radius-sm": s.radiusSm,
    "--ui-panel-radius": s.panelRadius,
    "--ui-elev-shadow": s.elevShadow,
  };
}

/** 表与 THEME_PACK_IDS / registry tokens 对齐 */
export function assertThemeControlRadiusTable(): void {
  for (const id of THEME_PACK_IDS) {
    const r = getThemePack(id).tokens.controlRadius;
    if (typeof r !== "string" || !r.trim()) {
      throw new Error(`tokens.controlRadius missing: ${id}`);
    }
  }
}
