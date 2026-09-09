import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  assertThemeControlRadiusTable,
  getThemeControlShape,
  resolveThemeControlShape,
} from "./controlShape";
import { THEME_PACK_IDS } from "./types";

describe("controlShape", () => {
  it("registry tokens.controlRadius 覆盖全部 ThemePackId", () => {
    expect(() => assertThemeControlRadiusTable()).not.toThrow();
    expect(THEME_PACK_IDS.length).toBeGreaterThan(20);
  });

  it("直角 pack 面板也直角，硬阴影", () => {
    const s = getThemeControlShape("ukiyo");
    expect(s.radius).toBe("0");
    expect(s.panelRadius).toBe("0");
    expect(s.antRadius).toBe(0);
    expect(s.elevShadow).toContain("4px 4px 0");
  });

  it("pill 按钮面板收成可读圆角", () => {
    const s = resolveThemeControlShape("999px");
    expect(s.radius).toBe("999px");
    expect(s.panelRadius).toBe("16px");
    expect(s.antRadius).toBe(16);
  });

  it("普通圆角跟按钮一致", () => {
    const s = resolveThemeControlShape("12px");
    expect(s.radius).toBe("12px");
    expect(s.panelRadius).toBe("12px");
    expect(s.radiusSm).toBe("8px");
  });

  it("pack .theme-btn 圆角只读 --ui-radius，不另写死", () => {
    const dir = join(process.cwd(), "src/theme/packs");
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".css"))) {
      const s = readFileSync(join(dir, f), "utf8");
      // 只查基础 .theme-btn，不含 .theme-btn.pri
      const blocks = [
        ...s.matchAll(/\.theme-btn(?![.\w-])[^{]*\{[^}]*\}/g),
      ].map((m) => m[0]);
      expect(blocks.length, f).toBeGreaterThan(0);
      for (const block of blocks) {
        expect(block, f).toMatch(/border-radius:\s*var\(--ui-radius\)/);
        expect(block, f).not.toMatch(
          /border-radius:\s*(?:0|999px|\d+px)(?!\s*\/)/
        );
      }
    }
  });
});
