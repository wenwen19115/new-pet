/**
 * 设置左侧窗外天气预览：会话 + hero 绑定。
 * enableOnPet 关：本页为 tick leader；开：镜像桌宠 leader（防双写盘）。
 * 落盘只经 schedulePersist（UI change / 本页会话 commit 共用）。
 */
import {
  computed,
  onUnmounted,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from "vue";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useI18n } from "vue-i18n";
import { characterHas, getCharacter } from "@/pet/characters";
import type { PetModelKind } from "@/pet/skins";
import {
  createDebouncedPersist,
  DEFAULT_SKY_WEATHER,
  normalizeSkyWeather,
  resolveTodFromDate,
  SKY_REGIONS,
  SKY_WEATHER_FIRE_EVENT,
  SKY_WEATHER_REFRESH_EVENT,
  type SkyEventId,
  type SkyTodId,
  type SkyWeatherConfig,
  type SkyWeatherFirePayload,
  type SkyWeatherId,
} from "@/pet/data/skyWeather";
import {
  resolveDisplayTod,
  resolveDisplayWeather,
} from "@/pet/runtime/skyWeatherScheduler";
import { resolveSystemRegion } from "@/pet/runtime/skyWeatherSystemRegion";
import { useSkyWeatherSession } from "@/pet/runtime/useSkyWeatherSession";
import {
  familyToneVars,
  themePackToFamily,
} from "@/pet/models/preview/themePackToFamily";

const MIRROR_TICK_MS = 1000;

export function useSkyWeatherPreview(opts: {
  skyWeather: Ref<SkyWeatherConfig>;
  onPersist: () => void | Promise<void>;
  themeStyle: Ref<string> | ComputedRef<string>;
  model: Ref<PetModelKind> | ComputedRef<PetModelKind>;
  heroPanelStyle: Ref<Record<string, string>> | ComputedRef<Record<string, string>>;
}) {
  const { t } = useI18n();

  const skyConfig = computed({
    get: () => opts.skyWeather.value ?? DEFAULT_SKY_WEATHER,
    set: (next: SkyWeatherConfig) => {
      opts.skyWeather.value = next;
    },
  });

  const petOwnsTick = computed(() => Boolean(skyConfig.value.enableOnPet));

  let mirrorTimer: ReturnType<typeof setInterval> | null = null;
  let fireUnlisten: UnlistenFn | null = null;
  /** listen() 异步返回前 stopMirror 时作废 */
  let fireListenGen = 0;
  let mirroring = false;
  const mirrorFireTimeouts = new Set<number>();

  const mirrorTod = ref<SkyTodId>(resolveTodFromDate());
  const mirrorWeather = ref<SkyWeatherId>("clear");
  const mirrorRainbow = ref(false);
  const mirrorEvents = ref<SkyEventId[]>([]);

  /** 会话与天气页控件共用落盘防抖（与桌宠 leader 同工厂） */
  const persist = createDebouncedPersist(() => opts.onPersist());
  const schedulePersist = persist.schedule;
  const flushPersist = () => persist.flush();

  /** 窗景 / 天气控件共用 patch（含落盘） */
  function patchSkyWeather(partial: Partial<SkyWeatherConfig>) {
    skyConfig.value = normalizeSkyWeather({
      ...skyConfig.value,
      ...partial,
    });
    schedulePersist();
  }

  const bgOpacityPercent = computed(() =>
    Math.round(Math.min(1, Math.max(0, skyConfig.value.bgOpacity)) * 100)
  );

  function onEnableOnPet(on: boolean) {
    if (skyConfig.value.enableOnPet === on) return;
    patchSkyWeather({ enableOnPet: on });
  }

  function onBgOpacity(v: number) {
    const pct = Math.min(100, Math.max(0, Math.round(v)));
    patchSkyWeather({ bgOpacity: pct / 100 });
  }

  function resetBgOpacity() {
    patchSkyWeather({ bgOpacity: 1 });
  }

  const session = useSkyWeatherSession({
    config: skyConfig,
    autoStart: !petOwnsTick.value,
    commit: (next, commitOpts) => {
      skyConfig.value = normalizeSkyWeather(next);
      // pet 为 leader 时本页不 tick 写盘；交接 stop flush 仍要落盘
      if (petOwnsTick.value && commitOpts?.flush !== true) return;
      if (commitOpts?.persist === false) return;
      if (commitOpts?.flush) {
        persist.flush(true);
        return;
      }
      schedulePersist();
    },
  });

  function syncMirrorDisplay() {
    const cfg = normalizeSkyWeather(skyConfig.value);
    mirrorTod.value = resolveDisplayTod(cfg);
    mirrorWeather.value = resolveDisplayWeather(cfg);
    mirrorRainbow.value = (cfg.runtime.rainbowUntil || 0) > Date.now();
  }

  function clearMirrorTimer() {
    if (!mirrorTimer) return;
    clearInterval(mirrorTimer);
    mirrorTimer = null;
  }

  function clearMirrorFireTimeouts() {
    for (const id of mirrorFireTimeouts) window.clearTimeout(id);
    mirrorFireTimeouts.clear();
  }

  function clearFireListen() {
    fireListenGen += 1;
    if (fireUnlisten) {
      fireUnlisten();
      fireUnlisten = null;
    }
  }

  function bindFireMirror() {
    if (fireUnlisten) return;
    const gen = ++fireListenGen;
    void listen<SkyWeatherFirePayload>(SKY_WEATHER_FIRE_EVENT, (ev) => {
      if (!mirroring) return;
      const list = ev.payload?.events ?? [];
      for (const id of list) {
        if (!mirrorEvents.value.includes(id)) {
          mirrorEvents.value = [...mirrorEvents.value, id];
        }
        const ms = id === "meteor" ? 2500 : 12_000;
        const tid = window.setTimeout(() => {
          mirrorFireTimeouts.delete(tid);
          if (!mirroring) return;
          mirrorEvents.value = mirrorEvents.value.filter((x) => x !== id);
        }, ms);
        mirrorFireTimeouts.add(tid);
      }
    }).then((un) => {
      if (gen !== fireListenGen || !mirroring) {
        un();
        return;
      }
      fireUnlisten = un;
    });
  }

  function startMirror() {
    mirroring = true;
    clearMirrorTimer();
    syncMirrorDisplay();
    mirrorTimer = setInterval(syncMirrorDisplay, MIRROR_TICK_MS);
    bindFireMirror();
  }

  function stopMirror() {
    mirroring = false;
    clearMirrorTimer();
    clearMirrorFireTimeouts();
    clearFireListen();
    mirrorEvents.value = [];
  }

  function applyTickOwner() {
    if (petOwnsTick.value) {
      session.stop();
      startMirror();
    } else {
      stopMirror();
      session.start();
    }
  }

  watch(petOwnsTick, () => {
    applyTickOwner();
  });

  if (petOwnsTick.value) startMirror();

  watch(
    () => opts.skyWeather.value,
    () => {
      if (!mirroring) return;
      syncMirrorDisplay();
    },
    { deep: true }
  );

  const windowFamily = computed(() =>
    themePackToFamily(opts.themeStyle.value || "ukiyo")
  );

  const skyFollowClock = computed(
    () => (opts.skyWeather.value?.todMode ?? "offline") === "sync"
  );

  const skyDisplayTod = computed(() =>
    mirroring ? mirrorTod.value : session.displayTod.value
  );
  const skyDisplayWeather = computed(() =>
    mirroring ? mirrorWeather.value : session.displayWeather.value
  );
  const skyRainbow = computed(() =>
    mirroring ? mirrorRainbow.value : session.rainbowActive.value
  );
  const skyEvents = computed(() =>
    mirroring ? mirrorEvents.value : session.activeEvents.value
  );

  /** 刷新后仍无网：显示「同步失败」 */
  const probeFailed = ref(false);
  /** 本页正在做 IP 探测（含镜像态，不全靠 session.linkBusy） */
  const localProbeBusy = ref(false);
  let minBusyTimer: ReturnType<typeof setTimeout> | null = null;
  let minBusyUntil = 0;

  /** 最短 busy 展示，避免探测瞬间完成看不到「同步中」 */
  const minBusyTick = ref(0);
  function armMinBusy(ms = 480) {
    minBusyUntil = Date.now() + ms;
    minBusyTick.value += 1;
    if (minBusyTimer) clearTimeout(minBusyTimer);
    minBusyTimer = setTimeout(() => {
      minBusyTimer = null;
      minBusyTick.value += 1;
    }, ms);
  }

  const skyNetBusy = computed(() => {
    void minBusyTick.value;
    return (
      localProbeBusy.value ||
      (!mirroring && Boolean(session.linkBusy.value)) ||
      Date.now() < minBusyUntil
    );
  });

  /** 预览徽章 = IP 联网探测（落盘 geoOnline；session 热缓存优先） */
  const netProbeOnline = computed(() => {
    if (session.netOnline.value) return true;
    return Boolean(normalizeSkyWeather(skyConfig.value).runtime.geoOnline);
  });

  watch(netProbeOnline, (online) => {
    if (online) probeFailed.value = false;
  });

  const skyNetLabel = computed(() => {
    if (skyNetBusy.value) return t("pet.skyWeatherUpdating");
    if (!netProbeOnline.value) {
      return probeFailed.value
        ? t("pet.skyWeatherLinkProbeFail")
        : t("pet.skyWeatherLinkOffline");
    }
    const cfg = normalizeSkyWeather(skyConfig.value);
    const id =
      session.netCityId.value ||
      (cfg.regionId === "system" ? cfg.runtime.locatedRegionId : cfg.regionId) ||
      "";
    const city = SKY_REGIONS[id]?.name || id;
    if (!city) return t("pet.skyWeatherLinkOnline");
    return t("pet.skyWeatherLinkOnlineCity", { city });
  });

  const skyNetCityId = computed(() => {
    const cfg = normalizeSkyWeather(skyConfig.value);
    if (cfg.regionId !== "system") return cfg.regionId;
    return (
      (!mirroring && session.netCityId.value) ||
      cfg.runtime.locatedRegionId ||
      session.netCityId.value ||
      ""
    );
  });

  const skyNetRefreshDisabled = computed(() => skyNetBusy.value);

  /** 强制探测联网；返回是否成功（天气系统开在线前调用） */
  async function probeSkyNet(): Promise<boolean> {
    if (localProbeBusy.value) return netProbeOnline.value;
    localProbeBusy.value = true;
    armMinBusy(480);
    try {
      if (petOwnsTick.value) {
        // 镜像：session 已停，本页本地探测并落盘徽章态；再通知桌宠拉实况
        const hit = await resolveSystemRegion({ force: true });
        const ok = !hit.offline;
        probeFailed.value = !ok;
        const cfg = normalizeSkyWeather(skyConfig.value);
        const located = ok ? hit.id : cfg.runtime.locatedRegionId;
        if (
          cfg.runtime.geoOnline !== ok ||
          cfg.runtime.locatedRegionId !== located
        ) {
          skyConfig.value = normalizeSkyWeather({
            ...cfg,
            runtime: {
              ...cfg.runtime,
              geoOnline: ok,
              locatedRegionId: located,
            },
          });
          schedulePersist();
        }
        void emit(SKY_WEATHER_REFRESH_EVENT);
        return ok;
      }

      // 本页 leader：只走 linkController（applyNetStatus 写 geoOnline）
      await session.refreshLinks();
      const ok = session.netOnline.value;
      probeFailed.value = !ok;
      return ok;
    } finally {
      localProbeBusy.value = false;
    }
  }

  async function refreshSkyNet() {
    if (skyNetRefreshDisabled.value) return;
    await probeSkyNet();
  }

  const heroMergedStyle = computed(() => ({
    ...(opts.heroPanelStyle.value || {}),
    ...familyToneVars(windowFamily.value),
  }));

  const previewActor = computed(
    () => getCharacter(opts.model.value).size.previewActor ?? null
  );

  // 3D 轨道角色硬裁会压扁，靠角色包演员框与 maxBoost
  const clipPreviewActor = computed(
    () => !characterHas(opts.model.value, "preview-orbit")
  );

  onUnmounted(() => {
    if (minBusyTimer) {
      clearTimeout(minBusyTimer);
      minBusyTimer = null;
    }
    stopMirror();
    session.stop();
    flushPersist();
  });

  return {
    skyDisplayTod,
    skyDisplayWeather,
    skyRainbow,
    skyEvents,
    skyFollowClock,
    skyNetCityId,
    skyNetBusy,
    skyNetLabel,
    skyNetBadgeOnline: netProbeOnline,
    skyNetRefreshDisabled,
    refreshSkyNet,
    probeSkyNet,
    schedulePersist,
    patchSkyWeather,
    bgOpacityPercent,
    onEnableOnPet,
    onBgOpacity,
    resetBgOpacity,
    windowFamily,
    heroMergedStyle,
    previewActor,
    clipPreviewActor,
  };
}
