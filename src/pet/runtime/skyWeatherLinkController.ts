/**
 * 窗外天气联网编排：探测 / 刷新 / 模式防抖 / gen 作废 / busy。
 * 会话只接线；tick 与展示不进这里。
 */
import { ref } from "vue";
import {
  SKY_REGIONS,
  normalizeSkyWeather,
  type SkyWeatherConfig,
} from "@/pet/data/skyWeather";
import { resolveSystemRegion } from "@/pet/runtime/skyWeatherSystemRegion";
import { applySkyLinkMode } from "@/pet/runtime/skyWeatherModeOps";
import {
  applySkyOnlineProbeFailure,
  syncSkyWeatherFromNetwork,
} from "@/pet/runtime/skyWeatherSync";

export type SkyWeatherCommitOpts = {
  /** 默认 true；tick 的 pity 递增应 false，避免每秒写盘 */
  persist?: boolean;
  /** 立刻落盘（离开页），跳过防抖 */
  flush?: boolean;
};

const MODE_WATCH_DEBOUNCE_MS = 180;

export function createSkyWeatherLinkController(deps: {
  getConfig: () => SkyWeatherConfig;
  commit: (next: SkyWeatherConfig, opts?: SkyWeatherCommitOpts) => void;
  enableNetworkSync?: boolean;
  onRefreshDisplay: (cfg: SkyWeatherConfig) => void;
  onSyncDisplay: (cfg: SkyWeatherConfig) => void;
}) {
  const netOnline = ref(false);
  const netCityId = ref("");
  const linkBusy = ref(false);

  let stopped = false;
  let netGen = 0;
  let intervalSyncing = false;
  let syncWatchTimer: ReturnType<typeof setTimeout> | null = null;
  let busyHeld = false;

  function applyNetStatus(online: boolean, cityId: string) {
    netOnline.value = online;
    netCityId.value = online ? cityId : "";
  }

  function isStale(gen: number) {
    return stopped || gen !== netGen;
  }

  function holdBusy() {
    if (busyHeld) return;
    busyHeld = true;
    linkBusy.value = true;
  }

  function releaseBusyIfCurrent(gen: number) {
    if (gen !== netGen || !busyHeld) return;
    busyHeld = false;
    linkBusy.value = false;
  }

  function clearBusy() {
    busyHeld = false;
    linkBusy.value = false;
  }

  function clearWatchTimer() {
    if (!syncWatchTimer) return;
    clearTimeout(syncWatchTimer);
    syncWatchTimer = null;
  }

  /** 探测联网：IP 定位一次；固定地区在线时城名用所选城 */
  async function probeNet(force = false, gen?: number) {
    const myGen = gen ?? netGen;
    const cfg = normalizeSkyWeather(deps.getConfig());
    // 手动城：不必等 IP，先亮所选城；在线态仍可借缓存/探测确认
    if (cfg.regionId !== "system" && SKY_REGIONS[cfg.regionId]) {
      if (force || !netOnline.value) {
        const hit = await resolveSystemRegion({ force });
        if (isStale(myGen)) return;
        if (hit.offline) {
          applyNetStatus(false, "");
          return;
        }
      } else if (isStale(myGen)) {
        return;
      }
      if (isStale(myGen)) return;
      applyNetStatus(true, cfg.regionId);
      return;
    }
    const hit = await resolveSystemRegion({ force });
    if (isStale(myGen)) return;
    if (hit.offline) {
      applyNetStatus(false, "");
      return;
    }
    applyNetStatus(true, hit.id);
  }

  /** 在线总闸但探测离线 → 回落离线包（开机/刷新/换城同规则） */
  function fallbackOfflineIfNeeded() {
    const cfg = normalizeSkyWeather(deps.getConfig());
    if (cfg.linkMode !== "online" || netOnline.value) return;
    deps.commit(applySkyOnlineProbeFailure(cfg), { persist: true });
    deps.onRefreshDisplay(normalizeSkyWeather(deps.getConfig()));
  }

  async function maybeSync(opts?: { force?: boolean; gen?: number }) {
    if (deps.enableNetworkSync === false) return;
    if (stopped) return;
    const cfg = normalizeSkyWeather(deps.getConfig());
    if (cfg.linkMode !== "online") return;
    const need = cfg.todMode === "sync" || cfg.weatherMode === "sync";
    if (!need) return;
    const intervalMs = cfg.sched.syncIntervalMin * 60 * 1000;
    if (
      !opts?.force
      && cfg.runtime.everSynced
      && Date.now() - cfg.runtime.lastSyncAt < intervalMs
    ) {
      return;
    }
    const myGen = opts?.gen ?? netGen;
    if (isStale(myGen)) return;
    if (!opts?.force) {
      if (intervalSyncing) return;
      intervalSyncing = true;
    }
    try {
      const next = await syncSkyWeatherFromNetwork(cfg);
      if (isStale(myGen)) return;
      if (
        opts?.force
        && normalizeSkyWeather(deps.getConfig()).regionId !== cfg.regionId
      ) {
        return;
      }
      deps.commit(next, { persist: true });
      deps.onSyncDisplay(next);
    } finally {
      if (!opts?.force) intervalSyncing = false;
    }
  }

  /** 手动刷新：打断进行中的换城，只认这一次 */
  async function refreshLinks() {
    if (stopped) return;
    clearWatchTimer();
    const gen = ++netGen;
    holdBusy();
    try {
      await probeNet(true, gen);
      if (isStale(gen)) return;
      fallbackOfflineIfNeeded();
      if (isStale(gen)) return;
      if (normalizeSkyWeather(deps.getConfig()).linkMode !== "online") return;
      await maybeSync({ force: true, gen });
      if (gen === netGen) {
        deps.onRefreshDisplay(normalizeSkyWeather(deps.getConfig()));
      }
    } finally {
      releaseBusyIfCurrent(gen);
    }
  }

  /** 总闸/换城合并拉网；防抖后只跑最新 gen，旧请求结果丢弃 */
  function scheduleModeWatchSync(opts?: { forceProbe?: boolean }) {
    clearWatchTimer();
    const wantNet =
      normalizeSkyWeather(deps.getConfig()).linkMode === "online";
    const gen = ++netGen;
    if (!wantNet) {
      clearBusy();
      return;
    }
    // 切到在线或当前显示离线：必须 force，避免吃失败缓存立刻回落
    const forceProbe = Boolean(opts?.forceProbe) || !netOnline.value;
    holdBusy();
    syncWatchTimer = setTimeout(() => {
      syncWatchTimer = null;
      void (async () => {
        try {
          if (isStale(gen)) return;
          await probeNet(forceProbe, gen);
          if (isStale(gen)) return;
          fallbackOfflineIfNeeded();
          if (isStale(gen)) return;
          if (normalizeSkyWeather(deps.getConfig()).linkMode !== "online") {
            return;
          }
          await maybeSync({ force: true, gen });
        } finally {
          releaseBusyIfCurrent(gen);
        }
      })();
    }, MODE_WATCH_DEBOUNCE_MS);
  }

  /** 首次启动：按探测结果落总闸默认，只跑一次 */
  async function bootstrapLinkMode() {
    const cfg = normalizeSkyWeather(deps.getConfig());
    if (cfg.linkBootstrapped) return;
    await probeNet(true);
    if (stopped) return;
    const next = {
      ...applySkyLinkMode(cfg, netOnline.value ? "online" : "offline"),
      linkBootstrapped: true,
    };
    deps.commit(normalizeSkyWeather(next), { persist: true });
    deps.onRefreshDisplay(normalizeSkyWeather(deps.getConfig()));
  }

  /** 开机：bootstrap 后按总闸探测；在线无网则回落 */
  async function bootProbe() {
    await bootstrapLinkMode();
    if (stopped) return;
    let cfg = normalizeSkyWeather(deps.getConfig());
    if (cfg.linkMode === "online") {
      await probeNet(true);
      if (stopped) return;
      fallbackOfflineIfNeeded();
    } else if (cfg.linkBootstrapped) {
      await probeNet(false);
      if (stopped) return;
    }
    if (stopped) return;
    cfg = normalizeSkyWeather(deps.getConfig());
    deps.onRefreshDisplay(cfg);
    if (cfg.linkMode === "online") void maybeSync();
  }

  function markRunning() {
    stopped = false;
  }

  /** 作废进行中的探测/同步，清 busy 与防抖 */
  function invalidate() {
    stopped = true;
    netGen += 1;
    clearWatchTimer();
    clearBusy();
  }

  return {
    netOnline,
    netCityId,
    linkBusy,
    markRunning,
    invalidate,
    bootProbe,
    maybeSync,
    refreshLinks,
    scheduleModeWatchSync,
  };
}
