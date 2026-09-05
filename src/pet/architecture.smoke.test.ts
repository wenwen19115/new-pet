import { describe, expect, it } from "vitest";
import {
  characterSupportsVrmAssets,
  getCharacter,
  isPetModelKind,
  listCharacters,
} from "@/pet/characters";
import { PET_EVENT_CATALOG } from "@/pet/events";
import {
  createDefaultPetHostPorts,
  createPetHostPortBus,
} from "@/pet/runtime/petHostPorts";
import { buildIdleMotionPool } from "@/pet/content/motion/motionPlayer";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  listPetShellCoveredIdleMotions,
  listPetShellKeyframeNames,
  resolvePetShellBobAnimation,
} from "@/pet/content/shell/petShellMotions";
import {
  PET_CHIP_DEMO_MOTIONS,
  PET_TOON_DEMO_MOTIONS,
  isPetIdleMotion,
  type PetIdleMotion,
} from "@/pet/content/motion/motions";
import { resolveToonAnimState } from "@/pet/content/motion/toonAnim";

describe("architecture smoke", () => {
  it("event catalog has unique pet:// names", () => {
    expect(PET_EVENT_CATALOG.length).toBeGreaterThan(10);
    expect(new Set(PET_EVENT_CATALOG).size).toBe(PET_EVENT_CATALOG.length);
    for (const name of PET_EVENT_CATALOG) {
      expect(name.startsWith("pet://")).toBe(true);
    }
  });

  it("character registry is the single model list", () => {
    const ids = listCharacters().map((c) => c.id);
    expect(ids).toEqual(["chip", "fig-sci", "toon", "vrm"]);
    expect(isPetModelKind("vrm")).toBe(true);
    expect(isPetModelKind("nope")).toBe(false);
  });

  it("VRM 资源走 capability，不写死 id", () => {
    expect(characterSupportsVrmAssets("vrm")).toBe(true);
    expect(characterSupportsVrmAssets("chip")).toBe(false);
    expect(getCharacter("vrm").capabilities).toContain("vrm-upload");
  });

  it("idle motion pool includes custom VRM only when capability allows", () => {
    const custom = [
      {
        id: "custom:demo",
        name: "demo",
        durationMs: 1000,
        includeInRandom: true,
        keyframes: [{ t: 0, bones: {} }],
      },
    ];
    const vrmPool = buildIdleMotionPool({
      idleMotions: getCharacter("vrm").idleMotions,
      allowCustomVrm: characterSupportsVrmAssets("vrm"),
      customVrmMotions: custom as never,
    });
    const chipPool = buildIdleMotionPool({
      idleMotions: getCharacter("chip").idleMotions,
      allowCustomVrm: characterSupportsVrmAssets("chip"),
      customVrmMotions: custom as never,
    });
    expect(vrmPool).toContain("custom:demo");
    expect(chipPool).not.toContain("custom:demo");
  });

  it("pet host ports default to safe no-ops", () => {
    const ports = createDefaultPetHostPorts();
    expect(() => ports.scheduleIdleAction()).not.toThrow();
    expect(() => ports.resetSleepTimer()).not.toThrow();
    expect(() => ports.onTap()).not.toThrow();
    expect(() => ports.onAfterPointerUp({ wasDragging: false })).not.toThrow();
  });

  it("port bus bind 后替换延迟实现", () => {
    const { ports, bind } = createPetHostPortBus();
    let n = 0;
    bind({ scheduleIdleAction: () => { n += 1; } });
    ports.scheduleIdleAction();
    expect(n).toBe(1);
  });

  it("shell bob motion table has CSS keyframes for every name", () => {
    const cssPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "content/shell/petShellMotions.css"
    );
    const css = readFileSync(cssPath, "utf8");
    for (const name of listPetShellKeyframeNames()) {
      expect(css).toContain(`@keyframes ${name}`);
    }
  });

  it("chip shell-demo motions that use bob are covered by the table", () => {
    const covered = new Set(listPetShellCoveredIdleMotions());
    /** 依赖 `.chip-bob` 壳 CSS 的 chip demo（不含纯模型内动作）。 */
    const shellDemo: PetIdleMotion[] = PET_CHIP_DEMO_MOTIONS.filter(
      (m) =>
        m.startsWith("screen-") ||
        m.startsWith("fly-") ||
        m === "figure-eight" ||
        m === "barrel-roll" ||
        m === "victory-burst"
    );
    for (const m of shellDemo) {
      expect(covered.has(m)).toBe(true);
    }
    expect(
      resolvePetShellBobAnimation({
        model: "chip",
        idle: "fly-orbit",
        mood: "idle",
        physicsActive: false,
      })
    ).toContain("pet-shell-fly-orbit");
    expect(
      resolvePetShellBobAnimation({
        model: "toon",
        idle: "fly-orbit",
        mood: "idle",
        physicsActive: false,
      })
    ).toBeNull();
    expect(
      resolvePetShellBobAnimation({
        model: "chip",
        idle: "idle-float",
        mood: "sleep",
        physicsActive: false,
        shellSleepBob: true,
      })
    ).toContain("pet-shell-breathe");
    expect(
      resolvePetShellBobAnimation({
        model: "toon",
        idle: "idle-float",
        mood: "sleep",
        physicsActive: false,
        shellSleepBob: false,
      })
    ).toBeNull();
    expect(getCharacter("chip").capabilities).toContain("shell-sleep-bob");
  });

  it("settings + chat ai modules stay folder-split", async () => {
    const settings = await import("@/pet/data/settings");
    expect(typeof settings.normalizePetSettings).toBe("function");
    expect(typeof settings.loadPetSettings).toBe("function");
    expect(typeof settings.switchPetModel).toBe("function");
    const ai = await import("@/pet/chat/ai");
    expect(typeof ai.askPetChatAi).toBe("function");
    expect(typeof ai.testPetChatConnection).toBe("function");
    expect(ai.PetChatAiError).toBeTruthy();
  });

  it("every character idle/demo motion is a known PetIdleMotion", () => {
    for (const c of listCharacters()) {
      for (const m of [...c.idleMotions, ...c.demoMotions]) {
        expect(isPetIdleMotion(m), `${c.id}:${m}`).toBe(true);
      }
    }
  });

  it("toon demo motions resolve to non-idle anim states (except happy-bounce)", () => {
    for (const m of PET_TOON_DEMO_MOTIONS) {
      const anim = resolveToonAnimState(m, "idle");
      if (m === "happy-bounce") expect(anim).toBe("happy");
      else expect(anim).not.toBe("idle");
    }
  });

  it("dependency: pure content + data/types do not import characters registry", async () => {
    const root = dirname(fileURLToPath(import.meta.url));
    const banned = /from\s+["'][^"']*characters(?:\/|["'])/;
    const files = [
      "content/motion/motionPlayer.ts",
      "content/motion/trailStyles.ts",
      "content/shell/petShellMotions.ts",
      "content/dialogue/personality.ts",
      "data/types.ts",
    ];
    for (const rel of files) {
      const src = readFileSync(join(root, rel), "utf8");
      expect(src, rel).not.toMatch(banned);
    }
    const settings = await import("@/pet/data/settings");
    expect(typeof settings.DEFAULT_PET_SETTINGS).toBe("object");
    expect(typeof settings.defaultProfileForModel).toBe("function");
  });
});
