/**
 * 窗外天气会话：tick + 可选真气象同步
 * 设置预览用；persist 由调用方写入 PetSettings。
 */
import type { Ref } from "vue";
import { onUnmounted, ref, watch } from "vue";
import {
  FALLBACK_REGION_ID,
  SKY_REGIONS,
  normalizeSkyWeather,
  regionWeatherOrFallback,
  resolveRegionByTimezone,
  resolveTodFromDate,
  type SkyEventId,
  type SkyTodId,
  type SkyWeatherConfig,
  type SkyWeatherId,
  type SkyWeatherRuntimeState,
} from "@/pet/data/skyWeather";
import { fetchOpenMeteoWeather } from "@/pet/bridge/skyWeather";
import {
  applySkySyncSuccess,
  resolveDisplayTod,
  resolveDisplayWeather,
  seedOfflineBoot,
  tickSkyWeather,
  type SkyTickFire,
} from "@/pet/runtime/skyWeatherScheduler";

export type SkyWeatherCommitOpts = {
  /** 默认 true；tick 的 pity 递增应 false，避免每秒写盘 */
  persist?: boolean;
};

function resolveCoords(regionId: string): { lat: number; lon: number; id: string } {
  const id =
    regionId === "system"
      ? resolveRegionByTimezone().id
      : SKY_REGIONS[regionId]
        ? regionId
        : FALLBACK_REGION_ID;
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
  );
}

export async function syncSkyWeatherFromNetwork(
  cfg: SkyWeatherConfig,
  now = Date.now()
): Promise<SkyWeatherConfig> {
  const needWx = cfg.weatherMode === "sync";
  const needTod = cfg.todMode === "sync";
  if (!needWx && !needTod) return cfg;

  let weather: SkyWeatherId | undefined;
  if (needWx) {
    const coords = resolveCoords(cfg.regionId);
    const hit = await fetchOpenMeteoWeather(coords.lat, coords.lon);
    if (hit?.ok && hit.weather) {
      weather = hit.weather;
    } else {
      weather = regionWeatherOrFallback(cfg.regionId).weather;
    }
  }
  return applySkySyncSuccess(cfg, {
    weather,
    tod: needTod ? resolveTodFromDate(new Date(now)) : undefined,
    now,
  });
}

export function useSkyWeatherSession(deps: {
  config: Ref<SkyWeatherConfig>;
  /** 写回配置（含 runtime）；opts.persist 默认 true */
  commit: (next: SkyWeatherConfig, opts?: SkyWeatherCommitOpts) => void;
  /** 特殊事件出现时回调（可选） */
  onFire?: (fires: SkyTickFire[]) => void;
  /** 是否跑真同步；默认 true */
  enableNetworkSync?: boolean;
}) {
  const displayTod = ref<SkyTodId>(resolveTodFromDate());
  const displayWeather = ref<SkyWeatherId>("clear");
  const rainbowActive = ref(false);
  const activeEvents = ref<SkyEventId[]>([]);
  const flyerCount = ref(0);

  let timer: ReturnType<typeof setInterval> | null = null;
  let syncTimer: ReturnType<typeof setInterval> | null = null;
  let seeded = false;
  let syncing = false;
  let stopped = false;
  const pendingTimeouts = new Set<number>();

  function scheduleTimeout(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      pendingTimeouts.delete(id);
      if (stopped) return;
      fn();
    }, ms);
    pendingTimeouts.add(id);
  }

  function clearPendingTimeouts() {
    for (const id of pendingTimeouts) window.clearTimeout(id);
    pendingTimeouts.clear();
  }

  function refreshDisplay(cfg: SkyWeatherConfig) {
    displayTod.value = resolveDisplayTod(cfg);
    displayWeather.value = resolveDisplayWeather(cfg);
    rainbowActive.value = (cfg.runtime.rainbowUntil || 0) > Date.now();
  }

  function applyTick() {
    const cfg = normalizeSkyWeather(deps.config.value);
    const r = tickSkyWeather(cfg, {
      now: Date.now(),
      flyerCount: flyerCount.value,
    });
    displayTod.value = r.displayTod;
    displayWeather.value = r.displayWeather;
    rainbowActive.value = r.rainbowActive;
    if (r.fires.length) {
      for (const f of r.fires) {
        if (!activeEvents.value.includes(f.eventId)) {
          activeEvents.value = [...activeEvents.value, f.eventId];
        }
        if (f.kind === "flyer") {
          flyerCount.value += 1;
          // 飞行物约 12s 后释放槽
          scheduleTimeout(() => {
            flyerCount.value = Math.max(0, flyerCount.value - 1);
            activeEvents.value = activeEvents.value.filter((id) => id !== f.eventId);
          }, 12_000);
        } else if (f.kind === "meteor") {
          scheduleTimeout(() => {
            activeEvents.value = activeEvents.value.filter((id) => id !== f.eventId);
          }, 2_500);
        }
      }
      deps.onFire?.(r.fires);
    }

    const manualChanged =
      r.cfg.manualTod !== cfg.manualTod
      || r.cfg.manualWeather !== cfg.manualWeather;
    const runtimeChanged =
      JSON.stringify(r.cfg.runtime) !== JSON.stringify(cfg.runtime);
    if (!runtimeChanged && !manualChanged) return;

    const shouldPersist =
      r.fires.length > 0
      || manualChanged
      || skyRuntimePersistWorthy(cfg.runtime, r.cfg.runtime);
    deps.commit(r.cfg, { persist: shouldPersist });
  }

  async function maybeSync() {
    if (deps.enableNetworkSync === false) return;
    if (syncing || stopped) return;
    const cfg = normalizeSkyWeather(deps.config.value);
    const need =
      cfg.todMode === "sync" || cfg.weatherMode === "sync";
    if (!need) return;
    const intervalMs = cfg.sched.syncIntervalMin * 60 * 1000;
    if (cfg.runtime.everSynced && Date.now() - cfg.runtime.lastSyncAt < intervalMs) {
      return;
    }
    syncing = true;
    try {
      const next = await syncSkyWeatherFromNetwork(cfg);
      if (stopped) return;
      deps.commit(next, { persist: true });
      displayTod.value = next.runtime.snapTod;
      displayWeather.value = next.runtime.snapWeather;
    } finally {
      syncing = false;
    }
  }

  function ensureSeeded() {
    if (seeded) return;
    seeded = true;
    const cfg = normalizeSkyWeather(deps.config.value);
    if (
      (cfg.todMode === "offline" || cfg.weatherMode === "offline")
      && !cfg.runtime.lastDayRollKey
      && cfg.manualWeather === "clear"
      && cfg.manualTod === "morning"
    ) {
      deps.commit(seedOfflineBoot(cfg), { persist: true });
    }
  }

  function start() {
    stopped = false;
    ensureSeeded();
    void maybeSync();
    applyTick();
    if (timer) clearInterval(timer);
    timer = setInterval(applyTick, 1000);
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(() => void maybeSync(), 60_000);
  }

  function stop() {
    stopped = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
    clearPendingTimeouts();
    // 离开页时落盘一次（含 pity），避免会话内每秒写盘
    deps.commit(normalizeSkyWeather(deps.config.value), { persist: true });
  }

  watch(
    () => [
      deps.config.value.todMode,
      deps.config.value.weatherMode,
      deps.config.value.regionId,
      deps.config.value.manualTod,
      deps.config.value.manualWeather,
    ],
    () => {
      refreshDisplay(normalizeSkyWeather(deps.config.value));
      void maybeSync();
    }
  );

  start();
  onUnmounted(stop);

  return {
    displayTod,
    displayWeather,
    rainbowActive,
    activeEvents,
    stop,
    start,
    forceSync: maybeSync,
  };
}
