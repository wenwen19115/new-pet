/**
 * 桌宠窗外天气投射：enableOnPet 时本窗为 tick leader 并落盘；
 * 关闭则停会话。设置页在开启时改为镜像（见 useSkyWeatherPreview）。
 */
import { computed, onUnmounted, watch, type Ref } from "vue";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  createDebouncedPersist,
  normalizeSkyWeather,
  SKY_WEATHER_FIRE_EVENT,
  SKY_WEATHER_REFRESH_EVENT,
  type SkyWeatherConfig,
  type SkyWeatherFirePayload,
} from "@/pet/data/skyWeather";
import { publishPetSettings } from "@/pet/data/settings";
import type { PetSettings } from "@/pet/data/types";
import { useSkyWeatherSession } from "@/pet/runtime/useSkyWeatherSession";
import {
  familyToneVars,
  themePackToFamily,
  type HeroWindowFamily,
} from "@/pet/models/preview/themePackToFamily";

export function useSkyWeatherPetBackdrop(deps: {
  settings: Ref<PetSettings>;
  /** 投射关闭动效未结束时为 true，暂缓 stopLeader */
  skyVisualHold?: Ref<boolean>;
}) {
  const skyConfig = computed(() =>
    normalizeSkyWeather(deps.settings.value.skyWeather)
  );
  const enabled = computed(() => skyConfig.value.enableOnPet);
  const bgOpacity = computed(() => skyConfig.value.bgOpacity);
  const hideableOnPet = computed(() => skyConfig.value.hideableOnPet);
  const hideEffectOnPet = computed(() => skyConfig.value.hideEffectOnPet);

  let running = false;
  let refreshUnlisten: UnlistenFn | null = null;
  /** listen() 异步返回前 stop/unmount 时作废 */
  let refreshListenGen = 0;

  async function writePersist(next: SkyWeatherConfig) {
    const merged = {
      ...deps.settings.value,
      skyWeather: normalizeSkyWeather(next),
    };
    const published = await publishPetSettings(merged);
    deps.settings.value = published;
  }

  const persist = createDebouncedPersist(() =>
    writePersist(deps.settings.value.skyWeather)
  );

  function applySkyConfig(next: SkyWeatherConfig) {
    deps.settings.value = {
      ...deps.settings.value,
      skyWeather: normalizeSkyWeather(next),
    };
  }

  const session = useSkyWeatherSession({
    config: skyConfig,
    autoStart: false,
    commit: (next, opts) => {
      // stop flush 须在 running 已关后仍落盘；其它 commit 仅 leader 期有效
      if (!running && opts?.flush !== true) return;
      applySkyConfig(next);
      if (opts?.persist === false) return;
      if (opts?.flush) {
        persist.flush(true);
        return;
      }
      persist.schedule();
    },
    onFire: (fires) => {
      if (!running || !fires.length) return;
      void emit(SKY_WEATHER_FIRE_EVENT, {
        events: fires.map((f) => f.eventId),
        at: Date.now(),
      } satisfies SkyWeatherFirePayload);
    },
  });

  const windowFamily = computed<HeroWindowFamily>(() =>
    themePackToFamily(deps.settings.value.theme?.style || "ukiyo")
  );

  const backdropStyle = computed(() => ({
    ...familyToneVars(windowFamily.value),
    "--sky-bg-opacity": String(bgOpacity.value),
  }));

  function clearRefreshListen() {
    refreshListenGen += 1;
    if (refreshUnlisten) {
      refreshUnlisten();
      refreshUnlisten = null;
    }
  }

  function startLeader() {
    if (running) return;
    running = true;
    session.start();
    if (!refreshUnlisten) {
      const gen = ++refreshListenGen;
      void listen(SKY_WEATHER_REFRESH_EVENT, () => {
        if (!running) return;
        // 徽章刷新：只探测联网，不强制换实况天气
        void session.refreshLinks({ syncWeather: false });
      }).then((un) => {
        if (gen !== refreshListenGen || !running) {
          un();
          return;
        }
        refreshUnlisten = un;
      });
    }
  }

  function stopLeader() {
    clearRefreshListen();
    if (!running) {
      persist.flush();
      return;
    }
    running = false;
    // session.stop → commit({ flush:true })；门控允许 !running 的 flush
    session.stop();
    persist.discard();
  }

  let dismissFallbackTimer: ReturnType<typeof setTimeout> | null = null;

  function refreshSkyWeatherBackdrop() {
    if (enabled.value) startLeader();
    else if (!deps.skyVisualHold?.value) stopLeader();
  }

  /** 关闭动效播完后停会话（窗尺寸固定，不再缩窗） */
  function finishSkyDismiss() {
    if (dismissFallbackTimer) {
      clearTimeout(dismissFallbackTimer);
      dismissFallbackTimer = null;
    }
    if (enabled.value) return;
    if (deps.skyVisualHold) deps.skyVisualHold.value = false;
    stopLeader();
  }

  watch(
    enabled,
    (on, prev) => {
      if (dismissFallbackTimer) {
        clearTimeout(dismissFallbackTimer);
        dismissFallbackTimer = null;
      }
      if (on) {
        startLeader();
        return;
      }
      if (prev !== true) {
        stopLeader();
        return;
      }
      // 关投射：等 PetApp 动效；超时兜底
      dismissFallbackTimer = setTimeout(() => {
        dismissFallbackTimer = null;
        finishSkyDismiss();
      }, 1200);
    },
    { immediate: true }
  );

  onUnmounted(() => {
    if (dismissFallbackTimer) {
      clearTimeout(dismissFallbackTimer);
      dismissFallbackTimer = null;
    }
    stopLeader();
  });

  return {
    skyBackdropEnabled: enabled,
    skyHideableOnPet: hideableOnPet,
    skyHideEffectOnPet: hideEffectOnPet,
    skyDisplayTod: session.displayTod,
    skyDisplayWeather: session.displayWeather,
    skyRainbow: session.rainbowActive,
    skyEvents: session.activeEvents,
    skyFollowClock: computed(() => skyConfig.value.todMode === "sync"),
    skyWindowFamily: windowFamily,
    skyBackdropStyle: backdropStyle,
    refreshSkyWeatherBackdrop,
    finishSkyDismiss,
    clearSkyWeatherBackdrop: stopLeader,
  };
}
