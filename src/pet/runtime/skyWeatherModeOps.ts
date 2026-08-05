/**
 * 设置页模式切换：封装 seed / display，别让 UI 直接抠 scheduler 种子。
 */
import {
  FALLBACK_REGION_ID,
  normalizeSkyWeather,
  type SkyLinkMode,
  type SkyTodMode,
  type SkyWeatherConfig,
  type SkyWeatherMode,
} from "@/pet/data/skyWeather";
import {
  resolveDisplayTod,
  resolveDisplayWeather,
  seedOfflineBoot,
} from "@/pet/runtime/skyWeatherScheduler";

export function applySkyTodMode(
  cfg: SkyWeatherConfig,
  todMode: SkyTodMode
): SkyWeatherConfig {
  // 总闸离线禁止切跟随；须先开联网
  if (todMode === "sync" && cfg.linkMode !== "online") {
    return normalizeSkyWeather(cfg);
  }
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
  // 进跟随：作废旧同步戳，避免沿用离线/固定态，立刻可再拉
  if (todMode === "sync" && cfg.todMode !== "sync") {
    next.runtime = {
      ...next.runtime,
      lastSyncAt: 0,
      everSynced: false,
    };
  }
  return normalizeSkyWeather(next);
}

export function applySkyWeatherMode(
  cfg: SkyWeatherConfig,
  weatherMode: SkyWeatherMode
): SkyWeatherConfig {
  if (weatherMode === "sync" && cfg.linkMode !== "online") {
    return normalizeSkyWeather(cfg);
  }
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
  // 进跟随：作废旧同步戳，避免继续显示离线抽签天气
  if (weatherMode === "sync" && cfg.weatherMode !== "sync") {
    next.runtime = {
      ...next.runtime,
      lastSyncAt: 0,
      everSynced: false,
      wxOnline: false,
    };
  }
  return normalizeSkyWeather(next);
}

/** 总闸：离线→深圳+双离线；在线→跟随系统+系统钟+实况 */
export function applySkyLinkMode(
  cfg: SkyWeatherConfig,
  linkMode: SkyLinkMode
): SkyWeatherConfig {
  if (cfg.linkMode === linkMode) return normalizeSkyWeather(cfg);

  if (linkMode === "offline") {
    let next = normalizeSkyWeather({
      ...cfg,
      linkMode: "offline",
      regionId: FALLBACK_REGION_ID,
      todMode: "offline",
      weatherMode: "offline",
    });
    const seeded = seedOfflineBoot(next);
    next = normalizeSkyWeather({
      ...next,
      manualTod: seeded.manualTod,
      manualWeather: seeded.manualWeather,
      runtime: {
        ...next.runtime,
        offlineIsDay: seeded.runtime.offlineIsDay,
        offlinePhaseStartedAt: seeded.runtime.offlinePhaseStartedAt,
        normalWeights: seeded.runtime.normalWeights,
        lastDayRollKey: seeded.runtime.lastDayRollKey,
        wxOnline: false,
        everSynced: false,
        lastSyncAt: 0,
      },
    });
    return next;
  }

  return normalizeSkyWeather({
    ...cfg,
    linkMode: "online",
    regionId: "system",
    todMode: "sync",
    weatherMode: "sync",
    runtime: {
      ...cfg.runtime,
      lastSyncAt: 0,
      everSynced: false,
      wxOnline: false,
    },
  });
}
