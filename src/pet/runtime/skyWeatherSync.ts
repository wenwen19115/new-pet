/**
 * 窗外天气网络同步与落盘判定（会话外纯函数，便于 smoke）。
 */
import {
  FALLBACK_REGION_ID,
  SKY_REGIONS,
  normalizeSkyWeather,
  regionWeatherOrFallback,
  resolveTodFromDate,
  resolveTodFromSun,
  type SkyTodId,
  type SkyWeatherConfig,
  type SkyWeatherId,
  type SkyWeatherRuntimeState,
} from "@/pet/data/skyWeather";
import { fetchOpenMeteoWeather } from "@/pet/bridge/skyWeather";
import { applySkySyncSuccess } from "@/pet/runtime/skyWeatherScheduler";
import {
  peekSystemRegionId,
  resolveSystemRegion,
} from "@/pet/runtime/skyWeatherSystemRegion";
import { applySkyLinkMode } from "@/pet/runtime/skyWeatherModeOps";

async function resolveSkyCoords(
  regionId: string
): Promise<{ lat: number; lon: number; id: string }> {
  if (regionId === "system") {
    const sys = await resolveSystemRegion();
    return { lat: sys.lat, lon: sys.lon, id: sys.id };
  }
  const id = SKY_REGIONS[regionId] ? regionId : FALLBACK_REGION_ID;
  const r = SKY_REGIONS[id] || SKY_REGIONS[FALLBACK_REGION_ID]!;
  return { lat: r.lat, lon: r.lon, id: r.id };
}

/** 相位/极端/彩虹等值得落盘；pity 递增不算 */
export function skyRuntimePersistWorthy(
  before: SkyWeatherRuntimeState,
  after: SkyWeatherRuntimeState
): boolean {
  return (
    before.lastDayRollKey !== after.lastDayRollKey
    || before.eggWeather !== after.eggWeather
    || before.eggStartedAt !== after.eggStartedAt
    || before.eggBaseWeather !== after.eggBaseWeather
    || before.eggDayKey !== after.eggDayKey
    || before.rainbowUntil !== after.rainbowUntil
    || before.lastExtremeAt !== after.lastExtremeAt
    || before.offlineIsDay !== after.offlineIsDay
    || before.offlinePhaseStartedAt !== after.offlinePhaseStartedAt
    || before.snapTod !== after.snapTod
    || before.snapWeather !== after.snapWeather
    || before.everSynced !== after.everSynced
    || before.lastSyncAt !== after.lastSyncAt
    || before.sunRiseAt !== after.sunRiseAt
    || before.sunSetAt !== after.sunSetAt
    || before.wxOnline !== after.wxOnline
  );
}

/** tick 内存是否有变（含 pity）；避免每秒 JSON.stringify */
export function skyRuntimeMemoryDirty(
  before: SkyWeatherRuntimeState,
  after: SkyWeatherRuntimeState
): boolean {
  if (skyRuntimePersistWorthy(before, after)) return true;
  if (before.lastEvolveAt !== after.lastEvolveAt) return true;
  if (
    before.eggStreak.id !== after.eggStreak.id
    || before.eggStreak.n !== after.eggStreak.n
  ) {
    return true;
  }
  const pityKeys = new Set([
    ...Object.keys(before.eventPity || {}),
    ...Object.keys(after.eventPity || {}),
  ]);
  for (const id of pityKeys) {
    const a = before.eventPity[id];
    const b = after.eventPity[id];
    if ((a?.drySec || 0) !== (b?.drySec || 0) || (a?.lastAt || 0) !== (b?.lastAt || 0)) {
      return true;
    }
  }
  const cdKeys = new Set([
    ...Object.keys(before.eventCdUntil || {}),
    ...Object.keys(after.eventCdUntil || {}),
  ]);
  for (const id of cdKeys) {
    if ((before.eventCdUntil[id] || 0) !== (after.eventCdUntil[id] || 0)) {
      return true;
    }
  }
  return false;
}

export async function syncSkyWeatherFromNetwork(
  cfg: SkyWeatherConfig,
  now = Date.now()
): Promise<SkyWeatherConfig> {
  // 总闸离线：一律不拉网（即使子项误为 sync）
  if (cfg.linkMode !== "online") return cfg;
  const needWx = cfg.weatherMode === "sync";
  const needTod = cfg.todMode === "sync";
  if (!needWx && !needTod) return cfg;

  const coords = await resolveSkyCoords(cfg.regionId);
  const hit = await fetchOpenMeteoWeather(coords.lat, coords.lon);

  let weather: SkyWeatherId | undefined;
  let wxOnline: boolean | undefined;
  let sunRiseAt = 0;
  let sunSetAt = 0;
  if (hit?.ok) {
    sunRiseAt = hit.sunRiseAt || 0;
    sunSetAt = hit.sunSetAt || 0;
    if (needWx && hit.weather) {
      weather = hit.weather;
      wxOnline = true;
    }
  } else if (needWx) {
    weather = regionWeatherOrFallback(cfg.regionId, peekSystemRegionId()).weather;
    wxOnline = false;
  }

  let tod: SkyTodId | undefined;
  if (needTod) {
    tod =
      sunRiseAt > 0 && sunSetAt > sunRiseAt
        ? resolveTodFromSun(new Date(now), sunRiseAt, sunSetAt)
        : resolveTodFromDate(new Date(now));
  }

  return applySkySyncSuccess(cfg, {
    weather,
    tod,
    now,
    wxOnline,
    sunRiseAt: hit?.ok ? sunRiseAt : undefined,
    sunSetAt: hit?.ok ? sunSetAt : undefined,
  });
}

/** 在线总闸探测失败 → 回落离线包并标记已 bootstrap */
export function applySkyOnlineProbeFailure(
  cfg: SkyWeatherConfig
): SkyWeatherConfig {
  return normalizeSkyWeather({
    ...applySkyLinkMode(cfg, "offline"),
    linkBootstrapped: true,
  });
}
