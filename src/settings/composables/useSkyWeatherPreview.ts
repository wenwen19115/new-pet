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
  SKY_WEATHER_REFRESH_DONE_EVENT,
  SKY_WEATHER_REFRESH_EVENT,
  type SkyEventId,
  type SkyTodId,
  type SkyWeatherConfig,
  type SkyWeatherFirePayload,
  type SkyWeatherId,
  type SkyWeatherRefreshDonePayload,
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

  function applyTickOwner(owns: boolean, wasLeader: boolean) {
    if (owns) {
      // 从本页 leader 交出时才 flush；开局镜像免写盘
      session.stop({ flush: wasLeader });
      startMirror();
    } else {
      stopMirror();
      session.start();
    }
  }

  // 开局即交接：投射开时必须 stop 本页 session，避免未 stop 仍跑联网表双写
  if (petOwnsTick.value) {
    applyTickOwner(true, false);
  }
  watch(petOwnsTick, (owns, prev) => {
    applyTickOwner(owns, prev === false);
  });

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
  /** 顶条/徽章：同步成功|失败，短亮 */
  const syncFlash = ref<"ok" | "fail" | null>(null);
  let flashTimer: ReturnType<typeof setTimeout> | null = null;
  let minBusyTimer: ReturnType<typeof setTimeout> | null = null;
  let minBusyUntil = 0;
  /** probeSkyNet 自己收尾提示，避免和 linkBusy 下落重复闪 */
  let flashOwnedByProbe = false;

  const FLASH_MS = 2000;

  function clearSyncFlashTimer() {
    if (!flashTimer) return;
    clearTimeout(flashTimer);
    flashTimer = null;
  }

  function showSyncFlash(ok: boolean) {
    syncFlash.value = ok ? "ok" : "fail";
    minBusyUntil = 0;
    minBusyTick.value += 1;
    clearSyncFlashTimer();
    flashTimer = setTimeout(() => {
      flashTimer = null;
      syncFlash.value = null;
    }, FLASH_MS);
  }

  function judgeSyncFlashOk(): boolean {
    const cfg = normalizeSkyWeather(skyConfig.value);
    if (cfg.linkMode !== "online") return false;
    const netOk = session.netOnline.value || Boolean(cfg.runtime.geoOnline);
    if (!netOk) return false;
    if (cfg.weatherMode === "sync") return Boolean(cfg.runtime.wxOnline);
    return true;
  }

  function waitRefreshDone(ms: number): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      let un: UnlistenFn | null = null;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        un?.();
        resolve(ok);
      };
      const timer = setTimeout(() => finish(false), ms);
      void listen(SKY_WEATHER_REFRESH_DONE_EVENT, (ev) => {
        const payload = ev.payload as SkyWeatherRefreshDonePayload | undefined;
        finish(Boolean(payload?.ok));
      }).then((u) => {
        un = u;
        if (settled) u();
      });
    });
  }

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

  // 切在线/换城等 linkBusy 收尾：顶条提示成败
  watch(
    () => session.linkBusy.value,
    (busy, wasBusy) => {
      if (mirroring || flashOwnedByProbe) return;
      if (wasBusy && !busy) showSyncFlash(judgeSyncFlashOk());
    }
  );

  const skyNetLabel = computed(() => {
    if (syncFlash.value === "ok") return t("pet.skyWeatherSyncOk");
    if (syncFlash.value === "fail") return t("pet.skyWeatherSyncFail");
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

  const skyNetBadgeOnline = computed(() => {
    if (syncFlash.value === "ok") return true;
    if (syncFlash.value === "fail") return false;
    return netProbeOnline.value;
  });

  const skySyncBannerVisible = computed(
    () => skyNetBusy.value || syncFlash.value != null
  );
  const skySyncBannerText = computed(() => {
    if (syncFlash.value === "ok") return t("pet.skyWeatherSyncOk");
    if (syncFlash.value === "fail") return t("pet.skyWeatherSyncFail");
    return t("pet.skyWeatherUpdating");
  });
  const skySyncBannerBusy = computed(
    () => skyNetBusy.value && syncFlash.value == null
  );

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

  const skyNetRefreshDisabled = computed(
    () => skyNetBusy.value && syncFlash.value == null
  );

  /** 强制探测联网；返回是否成功（天气系统开在线前调用） */
  async function probeSkyNet(): Promise<boolean> {
    if (localProbeBusy.value) return netProbeOnline.value;
    localProbeBusy.value = true;
    flashOwnedByProbe = true;
    armMinBusy(480);
    try {
      if (petOwnsTick.value) {
        // 镜像：本页探网；成功则等桌宠拉实况结果
        const hit = await resolveSystemRegion({ force: true });
        const netOk = !hit.offline;
        probeFailed.value = !netOk;
        const cfg = normalizeSkyWeather(skyConfig.value);
        const located = netOk ? hit.id : cfg.runtime.locatedRegionId;
        if (
          cfg.runtime.geoOnline !== netOk ||
          cfg.runtime.locatedRegionId !== located
        ) {
          skyConfig.value = normalizeSkyWeather({
            ...cfg,
            runtime: {
              ...cfg.runtime,
              geoOnline: netOk,
              locatedRegionId: located,
            },
          });
          schedulePersist();
        }
        if (!netOk) {
          showSyncFlash(false);
          return false;
        }
        const doneP = waitRefreshDone(4000);
        void emit(SKY_WEATHER_REFRESH_EVENT);
        const ok = await doneP;
        probeFailed.value = !ok;
        showSyncFlash(ok);
        return ok;
      }

      // 本页 leader：探通联网后再拉实况
      const ok = await session.refreshLinks();
      probeFailed.value = !ok;
      showSyncFlash(ok);
      return ok;
    } finally {
      localProbeBusy.value = false;
      flashOwnedByProbe = false;
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
    clearSyncFlashTimer();
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
    skyNetBadgeOnline,
    skySyncBannerVisible,
    skySyncBannerText,
    skySyncBannerBusy,
    skyNetRefreshDisabled,
    refreshSkyNet,
    probeSkyNet,
    schedulePersist,
    skyPersistPending: persist.isPending,
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
