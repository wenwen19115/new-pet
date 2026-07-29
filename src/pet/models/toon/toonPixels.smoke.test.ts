/**
 * Toon pixel factory smokes — fingerprints catch accidental art regressions.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { PetSkinVisual } from "@/pet/skins/types";
import {
  buildToonBodyPixels,
  buildToonBreathPixels,
  buildToonDecorPixels,
  buildToonEarPixels,
  buildToonFloatParticles,
  buildToonLightWing,
  buildToonPalette,
  buildToonPortalPixels,
  buildToonScenePixels,
  buildToonTailPixels,
  resolveToonPupil,
  type ToonPix,
} from "@/pet/models/toon";

const visual: PetSkinVisual = {
  bodyFrom: "#3a4558",
  bodyMid: "#2a3344",
  bodyTo: "#1e2430",
  dieFrom: "#222",
  dieMid: "#333",
  dieTo: "#111",
  accent: "#3ec8ff",
  accentSoft: "#9ae8ff",
  packageStroke: "#000",
  dieStroke: "#000",
  sideHi: "#5a6a80",
  sideMid: "#4a5a70",
  sideLo: "#3a4a60",
  backGrid: "#202830",
  mark: "#fff",
  ledHue: 190,
};

function fingerprint(pixels: ToonPix[]): string {
  return pixels
    .map((p) => `${p.x},${p.y},${p.fill},${p.opacity ?? 1}`)
    .join("|");
}

function assertInGrid(pixels: ToonPix[]) {
  for (const p of pixels) {
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x).toBeLessThanOrEqual(39);
    expect(p.y).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeLessThanOrEqual(39);
  }
}

const toonDir = dirname(fileURLToPath(import.meta.url));

describe("toon CSS split", () => {
  it("barrel imports layout/parts/anims and walk motion lives in anims", () => {
    const barrel = readFileSync(join(toonDir, "toonModel.css"), "utf8");
    expect(barrel).toContain('@import "./toonLayout.css"');
    expect(barrel).toContain('@import "./toonParts.css"');
    expect(barrel).toContain('@import "./toonAnims.css"');
    for (const file of ["toonLayout.css", "toonParts.css", "toonAnims.css"]) {
      readFileSync(join(toonDir, file), "utf8");
    }
    const anims = readFileSync(join(toonDir, "toonAnims.css"), "utf8");
    expect(anims).toContain('[data-anim="walk"]');
    expect(anims).toContain("@keyframes walk-bob");
  });
});

describe("preview orbit CSS", () => {
  it("does not leave Vue :deep() which breaks unscoped stylesheets", () => {
    const css = readFileSync(
      join(toonDir, "../preview/previewOrbit.css"),
      "utf8"
    );
    expect(css).not.toContain(":deep(");
    expect(css).toContain(".fig-stage .pix");
    expect(css).toContain(".orbit-rig .chip-slab");
  });
});

describe("toon pixel factories", () => {
  it("body / ear / tail stay non-empty and in 40×40", () => {
    const palette = buildToonPalette(visual);
    const ears = buildToonEarPixels(palette);
    const body = buildToonBodyPixels(palette);
    const tail = buildToonTailPixels(palette);
    expect(ears.length).toBeGreaterThan(10);
    expect(body.length).toBeGreaterThan(50);
    expect(tail.length).toBeGreaterThan(5);
    assertInGrid([...ears, ...body, ...tail]);
    // Stable art fingerprint (change only when intentional)
    expect(fingerprint(ears)).toMatchInlineSnapshot(
      `"13,8,#141820,1|14,7,#141820,1|15,6,#141820,1|14,8,#3ec8ff,1|15,7,#3ec8ff,1|15,8,#9ae8ff,1|15,9,#3a4558,1|16,7,#141820,1|16,8,#141820,1|24,8,#141820,1|25,7,#141820,1|26,6,#141820,1|25,8,#3ec8ff,1|26,7,#3ec8ff,1|26,8,#9ae8ff,1|26,9,#3a4558,1|27,7,#141820,1|27,8,#141820,1"`
    );
  });

  it("scene props appear for action anims and empty for idle", () => {
    expect(buildToonScenePixels("idle", visual.accent, visual.accentSoft)).toEqual(
      []
    );
    const fire = buildToonScenePixels("fire", visual.accent, visual.accentSoft);
    const thunder = buildToonScenePixels(
      "thunder",
      visual.accent,
      visual.accentSoft
    );
    expect(fire.length).toBeGreaterThan(10);
    expect(thunder.length).toBeGreaterThan(10);
    assertInGrid(fire);
    assertInGrid(thunder);
  });

  it("wings / decor / portal / aura are symmetric or non-empty", () => {
    const left = buildToonLightWing("l", visual.accent, visual.accentSoft, "crystal");
    const right = buildToonLightWing("r", visual.accent, visual.accentSoft, "crystal");
    expect(left.length).toBe(right.length);
    expect(left.length).toBeGreaterThan(10);
    // Mirror: left x + right x === 39
    for (let i = 0; i < left.length; i++) {
      expect(left[i]!.x + right[i]!.x).toBe(39);
      expect(left[i]!.y).toBe(right[i]!.y);
    }
    expect(
      buildToonDecorPixels("crystal", visual.accent, visual.accentSoft).length
    ).toBeGreaterThan(0);
    expect(
      buildToonPortalPixels(visual.accent, visual.accentSoft).length
    ).toBeGreaterThan(10);
    expect(
      buildToonBreathPixels(visual.accent, visual.accentSoft).length
    ).toBeGreaterThan(5);
    expect(buildToonFloatParticles(visual.accent, visual.accentSoft).length).toBe(
      18
    );
  });

  it("pupil stays inside eye white", () => {
    const mid = resolveToonPupil({ x: 0, y: 0 });
    const edge = resolveToonPupil({ x: 1, y: 1 });
    expect(mid.ox).toBeGreaterThanOrEqual(0.35);
    expect(edge.ox).toBeLessThanOrEqual(3 - 1.2 - 0.35);
  });
});
