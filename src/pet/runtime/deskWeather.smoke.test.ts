import { describe, expect, it } from "vitest";
import {
  DEFAULT_DESK_WEATHER,
  normalizeDeskWeather,
} from "@/pet/data/deskWeather";
import { pickDeskWeatherLine } from "@/pet/content/dialogue/lines";
import { applyPetMood } from "@/pet/runtime/petHostMood";

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
});
