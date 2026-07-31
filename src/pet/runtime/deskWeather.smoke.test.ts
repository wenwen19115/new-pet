import { describe, expect, it } from "vitest";
import {
  DEFAULT_DESK_WEATHER,
  normalizeDeskWeather,
} from "@/pet/data/deskWeather";
import { pickDeskWeatherLine } from "@/pet/content/dialogue/lines";
import { applyPetMood } from "@/pet/runtime/petHostMood";
import {
  commitDeskWeatherFire,
  createDeskWeatherEngineState,
  observeDeskWeather,
} from "@/pet/runtime/deskWeatherEngine";

describe("desk weather", () => {
  it("normalize fills defaults and clamps changeStep", () => {
    const n = normalizeDeskWeather({
      enabled: true,
      appsMany: { changeStep: 99 },
      switchBurst: { windowMs: 500, switchCount: 1 },
      maxDwell: { tiersSec: [10, 5] },
    });
    expect(n.appsMany.changeStep).toBe(10);
    expect(n.switchBurst.windowMs).toBe(1000);
    expect(n.switchBurst.switchCount).toBe(2);
    expect(n.maxDwell.tiersSec).toEqual([10, 11]);
    expect(n.maxDwell.tiersSec[1]).toBeGreaterThan(n.maxDwell.tiersSec[0]!);
    expect(normalizeDeskWeather(undefined).maxDwell.tiersSec).toEqual([30, 180]);
    expect(normalizeDeskWeather(undefined).enabled).toBe(
      DEFAULT_DESK_WEATHER.enabled
    );
    const cool0 = normalizeDeskWeather({
      cooldown: { appsChangeSec: 0, switchBurstSec: 0 },
    });
    expect(cool0.cooldown.appsChangeSec).toBe(0);
    expect(cool0.cooldown.switchBurstSec).toBe(0);
    expect(DEFAULT_DESK_WEATHER.cooldown.appsChangeSec).toBe(10);
    expect(DEFAULT_DESK_WEATHER.cooldown.switchBurstSec).toBe(10);
  });

  it("pickDeskWeatherLine returns character lines per scene", () => {
    const up = pickDeskWeatherLine(
      { type: "apps-up", appCount: 10, delta: 3 },
      "chip",
      "sunny"
    );
    expect(up.length).toBeGreaterThan(0);
    expect(up).toMatch(/窗口/);
    const down = pickDeskWeatherLine(
      { type: "apps-down", appCount: 4, delta: 3 },
      "toon",
      "sunny"
    );
    expect(down.length).toBeGreaterThan(0);
    expect(down).toMatch(/窗口/);
    const burst = pickDeskWeatherLine(
      { type: "switch-burst" },
      "fig-sci",
      "sunny"
    );
    expect(burst.length).toBeGreaterThan(0);
    expect(burst).toMatch(/窗口/);
    const dwell = pickDeskWeatherLine(
      { type: "max-dwell", tier: "3m", dwellSec: 180 },
      "fig-sci",
      "sunny"
    );
    expect(dwell.length).toBeGreaterThan(0);
    expect(dwell).toMatch(/铺满|挤|靠边/);
  });

  it("desk-weather mood reason sets curious", () => {
    let mood: "idle" | "curious" | "sleep" = "idle";
    const ok = applyPetMood("curious", "desk-weather", {
      getMood: () => mood,
      setMood: (m) => {
        mood = m as typeof mood;
      },
      speaking: () => false,
      dragging: () => false,
      isMotionLocked: () => false,
    });
    expect(ok).toBe(true);
    expect(mood).toBe("curious");
  });

  it("engine：增减达阈后 observe 出 kind，commit 才钉基线", () => {
    const cfg = normalizeDeskWeather({
      appsMany: { enabled: true, changeStep: 3 },
      switchBurst: { enabled: false },
      maxDwell: { enabled: false },
      cooldown: { appsChangeSec: 10, switchBurstSec: 10 },
    });
    const state = createDeskWeatherEngineState();
    const t0 = 1_000_000;
    expect(
      observeDeskWeather(
        state,
        cfg,
        {
          appCount: 5,
          foregroundKey: "",
          foregroundImmersive: false,
          recentSwitchTimesMs: [],
        },
        t0
      )
    ).toBeNull();
    expect(state.appsBaseline).toBe(5);

    const kind = observeDeskWeather(
      state,
      cfg,
      {
        appCount: 8,
        foregroundKey: "",
        foregroundImmersive: false,
        recentSwitchTimesMs: [],
      },
      t0 + 100
    );
    expect(kind).toEqual({ type: "apps-up", appCount: 8, delta: 3 });
    expect(state.appsBaseline).toBe(5);

    commitDeskWeatherFire(
      state,
      cfg,
      kind!,
      {
        appCount: 8,
        foregroundKey: "",
        foregroundImmersive: false,
        recentSwitchTimesMs: [],
      },
      t0 + 100
    );
    expect(state.appsBaseline).toBe(8);
    expect(state.appsChangeCooldownUntil).toBe(t0 + 100 + 10_000);
  });
});
