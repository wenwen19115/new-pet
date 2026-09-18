import { describe, expect, it } from "vitest";
import { resolveSpriteAnim, spritePlayLoops } from "./resolveAnim";
import { LOCAL_PET_ATLAS } from "./localAtlas";
import { atlasForManifest } from "./manifest";
import { testSpriteHit } from "./spriteHit";

describe("sprite pets", () => {
  it("maps sleep mood to waiting row", () => {
    expect(resolveSpriteAnim("sleep", "idle-float").anim).toBe("waiting");
  });

  it("maps mug tip / purr with lively playback", () => {
    expect(resolveSpriteAnim("idle", "mug-tip")).toMatchObject({
      anim: "failed",
      playback: "pingpong",
    });
    expect(resolveSpriteAnim("idle", "mug-purr")).toMatchObject({
      anim: "active",
      playback: "loop",
    });
    expect(spritePlayLoops(resolveSpriteAnim("idle", "happy-bounce"))).toBe(
      true
    );
  });

  it("uses pingpong for short gestures (not freeze on end frame)", () => {
    expect(resolveSpriteAnim("idle", "mug-steam").playback).toBe("pingpong");
    expect(resolveSpriteAnim("idle", "mug-stare").playback).toBe("pingpong");
  });

  it("differentiates same atlas row by pace/playback", () => {
    expect(resolveSpriteAnim("idle", "mug-sip")).toMatchObject({
      anim: "jump",
      playback: "pingpong",
    });
    expect(resolveSpriteAnim("idle", "mug-purr")).toMatchObject({
      anim: "active",
      playback: "loop",
    });
  });

  it("gesture / hop / ambient roles", async () => {
    const { spriteMotionRole } = await import("./spriteMotionRole");
    expect(spriteMotionRole("mug-steam")).toBe("gesture");
    expect(spriteMotionRole("happy-bounce")).toBe("hop");
    expect(spriteMotionRole("mug-stare")).toBe("ambient");
    expect(spriteMotionRole("sway-step")).toBe("ambient");
  });

  it("idle pick weights native over shared sway", async () => {
    const { idleMotionPickWeight, pickWeightedIdleMotion } = await import(
      "../../content/motion/motionPlayer"
    );
    expect(idleMotionPickWeight("mug-steam")).toBe(3);
    expect(idleMotionPickWeight("sway-step")).toBe(1);
    expect(pickWeightedIdleMotion([])).toBeNull();
    expect(pickWeightedIdleMotion(["sway-step"])).toBe("sway-step");
  });

  it("maps character-native motions onto atlas rows", () => {
    expect(resolveSpriteAnim("idle", "mug-stare").anim).toBe("review");
    expect(resolveSpriteAnim("idle", "mug-purr").anim).toBe("active");
    expect(resolveSpriteAnim("idle", "mug-nap").anim).toBe("waiting");
    expect(resolveSpriteAnim("idle", "mug-tip").anim).toBe("failed");
    expect(resolveSpriteAnim("idle", "mug-sip").anim).toBe("jump");
  });

  it("tip-toe / side-hop flip for limb pets", () => {
    expect(resolveSpriteAnim("idle", "tip-toe").flipEvery).toBe(1);
    expect(resolveSpriteAnim("idle", "side-hop").flipEvery).toBe(2);
    expect(resolveSpriteAnim("idle", "sway-step").flipEvery).toBeUndefined();
  });

  it("keeps sway/tip-toe in place (not walk)", () => {
    expect(resolveSpriteAnim("idle", "sway-step").anim).toBe("idle");
    expect(resolveSpriteAnim("idle", "tip-toe").anim).toBe("idle");
    expect(resolveSpriteAnim("idle", "idle-float").anim).toBe("idle");
    expect(resolveSpriteAnim("idle", "sway-step", 1.25).pace).toBe(1.25);
  });

  it("local atlas is 8×9 Codex keyframes with per-frame timing curves", async () => {
    const { spriteFrameDelayMs } = await import("./atlas");
    expect(LOCAL_PET_ATLAS.columns).toBe(8);
    expect(LOCAL_PET_ATLAS.rows).toBe(9);
    expect(LOCAL_PET_ATLAS.frameW / LOCAL_PET_ATLAS.frameH).toBeCloseTo(
      108 / 128,
      5
    );
    expect(LOCAL_PET_ATLAS.frames.wave).toBe(4);
    expect(LOCAL_PET_ATLAS.frames.jump).toBe(5);
    expect(LOCAL_PET_ATLAS.frames.idle).toBe(6);
    expect(LOCAL_PET_ATLAS.frames.walk).toBe(8);
    const idleMs = LOCAL_PET_ATLAS.frameMs.idle;
    expect(Array.isArray(idleMs)).toBe(true);
    expect(spriteFrameDelayMs(idleMs, 0)).toBeGreaterThan(
      spriteFrameDelayMs(idleMs, 1)
    );
  });

  it("hit uses [-1,1] NDC and accepts body center", () => {
    expect(testSpriteHit(0, 0)).toBe(true);
    expect(testSpriteHit(0, -0.35)).toBe(true);
    expect(testSpriteHit(0.95, 0.95)).toBe(false);
  });

  it("manifest can override frame counts", () => {
    const a = atlasForManifest({
      id: "x",
      name: { zh: "x", en: "x" },
      spritesheet: "atlas-fixed.png",
      frames: { idle: 4 },
    });
    expect(a.frames.idle).toBe(4);
    expect(a.frames.walk).toBe(LOCAL_PET_ATLAS.frames.walk);
    expect(a.columns).toBe(8);
  });

  it("manifest can override columns for dense atlases", () => {
    const a = atlasForManifest({
      id: "mug-cat",
      name: { zh: "杯杯", en: "Steamy" },
      spritesheet: "atlas-fixed.png",
      columns: 12,
      frames: {
        idle: 12,
        walk: 12,
        run: 12,
        wave: 12,
        jump: 12,
        failed: 12,
        waiting: 12,
        active: 12,
        review: 12,
      },
    });
    expect(a.columns).toBe(12);
    expect(a.frames.wave).toBe(12);
    expect(a.frameW).toBe(108);
  });

  it("handless mug pool has no limb / wave-hand motions", async () => {
    const { PET_MUG_DEMO_MOTIONS } = await import(
      "../../content/motion/motions"
    );
    const banned = [
      "bow-nod",
      "tip-toe",
      "side-hop",
      "stretch-up",
      "sprite-cheer",
      "tap-frenzy",
    ];
    for (const m of banned) {
      expect(PET_MUG_DEMO_MOTIONS).not.toContain(m);
    }
    expect(PET_MUG_DEMO_MOTIONS).toContain("mug-steam");
    expect(PET_MUG_DEMO_MOTIONS).toContain("mug-tip");
  });
});
