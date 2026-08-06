/**
 * 窗外天气会话：tick + 展示；联网走 skyWeatherLinkController。
 * 设置预览用；persist 由调用方写入 PetSettings。
 */
import type { Ref } from "vue";
import { onUnmounted, ref, watch } from "vue";
import {
  normalizeSkyWeather,
  resolveTodFromDate,
  type SkyEventId,
  type SkyTodId,
  type SkyWeatherConfig,
  type SkyWeatherId,
} from "@/pet/data/skyWeather";
import {
  resolveDisplayTod,
  resolveDisplayWeather,
  seedOfflineBoot,
  tickSkyWeather,
  type SkyTickFire,
} from "@/pet/runtime/skyWeatherScheduler";
import {
  createSkyWeatherLinkController,
  type SkyWeatherCommitOpts,
} from "@/pet/runtime/skyWeatherLinkController";
import {
  skyRuntimeMemoryDirty,
  skyRuntimePersistWorthy,
} from "@/pet/runtime/skyWeatherSync";

export function useSkyWeatherSession(deps: {
  config: Ref<SkyWeatherConfig>;
  /** 写回配置（含 runtime）；opts.persist 默认 true */
  commit: (next: SkyWeatherConfig, opts?: SkyWeatherCommitOpts) => void;
  /** 特殊事件出现时回调（可选） */
  onFire?: (fires: SkyTickFire[]) => void;
  /** 是否跑真同步；默认 true */
  enableNetworkSync?: boolean;
  /** 默认 true；桌宠/设置按 enableOnPet 互斥启停 */
  autoStart?: boolean;
}) {
  const displayTod = ref<SkyTodId>(resolveTodFromDate());
  const displayWeather = ref<SkyWeatherId>("clear");
  const rainbowActive = ref(false);
  const activeEvents = ref<SkyEventId[]>([]);
  const flyerCount = ref(0);

  let timer: ReturnType<typeof setInterval> | null = null;
  let syncTimer: ReturnType<typeof setInterval> | null = null;
  let seeded = false;
  let stopped = false;
  const pendingTimeouts = new Set<number>();

  function refreshDisplay(cfg: SkyWeatherConfig) {
    displayTod.value = resolveDisplayTod(cfg);
    displayWeather.value = resolveDisplayWeather(cfg);
    rainbowActive.value = (cfg.runtime.rainbowUntil || 0) > Date.now();
  }

  const link = createSkyWeatherLinkController({
    getConfig: () => deps.config.value,
    commit: deps.commit,
    enableNetworkSync: deps.enableNetworkSync,
    onRefreshDisplay: refreshDisplay,
    onSyncDisplay: (cfg) => {
      displayTod.value = cfg.runtime.snapTod;
      displayWeather.value = cfg.runtime.snapWeather;
    },
  });

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
    const runtimeChanged = skyRuntimeMemoryDirty(cfg.runtime, r.cfg.runtime);
    if (!runtimeChanged && !manualChanged) return;

    const shouldPersist =
      r.fires.length > 0
      || manualChanged
      || skyRuntimePersistWorthy(cfg.runtime, r.cfg.runtime);
    deps.commit(r.cfg, { persist: shouldPersist });
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
    link.markRunning();
    ensureSeeded();
    void link.bootProbe();
    applyTick();
    if (timer) clearInterval(timer);
    timer = setInterval(applyTick, 1000);
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(() => void link.maybeSync(), 60_000);
  }

  function stop() {
    // 父级显式 stop + onUnmounted(stop) 会叠一次；只 flush 首趟
    if (stopped) return;
    stopped = true;
    link.invalidate();
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
    clearPendingTimeouts();
    // 离开页即时落盘（含 pity），避免防抖未到就卸载
    deps.commit(normalizeSkyWeather(deps.config.value), {
      persist: true,
      flush: true,
    });
  }

  watch(
    [
      () => deps.config.value.todMode,
      () => deps.config.value.weatherMode,
      () => deps.config.value.regionId,
      () => deps.config.value.linkMode,
    ],
    (curr, prev) => {
      refreshDisplay(normalizeSkyWeather(deps.config.value));
      const linkBecameOnline =
        curr[3] === "online" && (prev?.[3] ?? "") !== "online";
      link.scheduleModeWatchSync({ forceProbe: linkBecameOnline });
    }
  );

  watch(
    [
      () => deps.config.value.manualTod,
      () => deps.config.value.manualWeather,
    ],
    () => {
      refreshDisplay(normalizeSkyWeather(deps.config.value));
    }
  );

  if (deps.autoStart !== false) start();
  onUnmounted(stop);

  return {
    displayTod,
    displayWeather,
    rainbowActive,
    activeEvents,
    netOnline: link.netOnline,
    netCityId: link.netCityId,
    linkBusy: link.linkBusy,
    refreshLinks: link.refreshLinks,
    start,
    stop,
  };
}
