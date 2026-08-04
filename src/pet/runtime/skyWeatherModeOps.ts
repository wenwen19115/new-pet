/**
 * 设置页模式切换：封装 seed / display，别让 UI 直接抠 scheduler 种子。
 */
import {
  normalizeSkyWeather,
  type SkyTodMode,
  type SkyWeatherConfig,
  type SkyWeatherMode,
} from "@/pet/data/skyWeather";
import {
  resolveDisplayTod,
  resolveDisplayWeather,
  seedOfflineBoot,
} from "@/pet/runtime/skyWeatherScheduler";

export { resolveDisplayTod, resolveDisplayWeather };

export function applySkyTodMode(
  cfg: SkyWeatherConfig,
  todMode: SkyTodMode
): SkyWeatherConfig {
  let next = normalizeSkyWeather({ ...cfg, todMode });
  if (todMode === "offline" && cfg.todMode !== "offline") {
    const seeded = seedOfflineBoot({ ...next, weatherMode: "offline" });
    next.manualTod = seeded.manualTod;
    next.runtime = {
      ...next.runtime,
      offlineIsDay: seeded.runtime.offlineIsDay,
      offlinePhaseStartedAt: seeded.runtime.offlinePhaseStartedAt,
    };
    next.weatherMode = cfg.weatherMode;
    next.manualWeather = cfg.manualWeather;
  }
  if (todMode === "fixed") {
    next.manualTod = resolveDisplayTod(cfg);
  }
  return normalizeSkyWeather(next);
}

export function applySkyWeatherMode(
  cfg: SkyWeatherConfig,
  weatherMode: SkyWeatherMode
): SkyWeatherConfig {
  let next = normalizeSkyWeather({ ...cfg, weatherMode });
  if (weatherMode === "offline" && cfg.weatherMode !== "offline") {
    const seeded = seedOfflineBoot({ ...next, todMode: "offline" });
    next.manualWeather = seeded.manualWeather;
    next.runtime = {
      ...next.runtime,
      normalWeights: seeded.runtime.normalWeights,
      lastDayRollKey: seeded.runtime.lastDayRollKey,
    };
    next.todMode = cfg.todMode;
    next.manualTod = cfg.manualTod;
  }
  if (weatherMode === "fixed") {
    next.manualWeather = resolveDisplayWeather({
      ...cfg,
      runtime: { ...cfg.runtime, eggWeather: "" },
    });
    next.runtime = { ...next.runtime, eggWeather: "" };
  }
  return normalizeSkyWeather(next);
}
