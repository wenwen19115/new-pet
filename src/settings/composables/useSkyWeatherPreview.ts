/**
 * 设置左侧窗外天气预览：会话 + hero 绑定。
 * 生命周期跟设置页；落盘只经本门 schedulePersist（会话 commit / UI change 共用）。
 */
import { computed, onUnmounted, type ComputedRef, type Ref } from "vue";
import { useI18n } from "vue-i18n";
import { characterHas, getCharacter } from "@/pet/characters";
import type { PetModelKind } from "@/pet/skins";
import {
  DEFAULT_SKY_WEATHER,
  normalizeSkyWeather,
  SKY_REGIONS,
  type SkyWeatherConfig,
} from "@/pet/data/skyWeather";
import { useSkyWeatherSession } from "@/pet/runtime/useSkyWeatherSession";
import {
  familyToneVars,
  themePackToFamily,
} from "@/pet/models/preview/themePackToFamily";

const PERSIST_DEBOUNCE_MS = 420;

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

  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let persistQueued = false;

  /** 会话与天气页控件共用的唯一落盘防抖 */
  function schedulePersist() {
    persistQueued = true;
    if (persistTimer) return;
    persistTimer = setTimeout(() => {
      persistTimer = null;
      if (!persistQueued) return;
      persistQueued = false;
      void opts.onPersist();
    }, PERSIST_DEBOUNCE_MS);
  }

  function flushPersist() {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    if (!persistQueued) return;
    persistQueued = false;
    void opts.onPersist();
  }

  const session = useSkyWeatherSession({
    config: skyConfig,
    commit: (next, commitOpts) => {
      skyConfig.value = normalizeSkyWeather(next);
      if (commitOpts?.persist === false) return;
      if (commitOpts?.flush) {
        persistQueued = true;
        flushPersist();
        return;
      }
      schedulePersist();
    },
  });

  const windowFamily = computed(() =>
    themePackToFamily(opts.themeStyle.value || "ukiyo")
  );

  const skyFollowClock = computed(
    () => (opts.skyWeather.value?.todMode ?? "offline") === "sync"
  );

  const skyLinkMode = computed(
    () => opts.skyWeather.value?.linkMode ?? "offline"
  );

  const skyNetLabel = computed(() => {
    // 总闸离线：固定显示离线（深圳）
    if (skyLinkMode.value === "offline") {
      return t("pet.skyWeatherLinkOfflineCity", {
        city: SKY_REGIONS.shenzhen?.name || "深圳",
      });
    }
    if (session.linkBusy.value) return t("pet.skyWeatherUpdating");
    if (!session.netOnline.value) return t("pet.skyWeatherLinkOffline");
    const id = session.netCityId.value;
    const city = SKY_REGIONS[id]?.name || id;
    if (!city) return t("pet.skyWeatherLinkOnline");
    return t("pet.skyWeatherLinkOnlineCity", { city });
  });

  const skyNetBadgeOnline = computed(
    () => skyLinkMode.value === "online" && session.netOnline.value
  );

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

  // 离开页落盘由 session.stop → commit({ flush:true })，别再挂一层 flush
  onUnmounted(() => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
  });

  return {
    skyDisplayTod: session.displayTod,
    skyDisplayWeather: session.displayWeather,
    skyRainbow: session.rainbowActive,
    skyEvents: session.activeEvents,
    skyFollowClock,
    /** 天气 tab 地区下拉「跟随系统」城名 */
    skyNetCityId: session.netCityId,
    /** 全局联网文案 / 手动刷新 */
    skyNetBusy: session.linkBusy,
    skyNetLabel,
    skyNetBadgeOnline,
    refreshSkyNet: session.refreshLinks,
    /** UI @change 与会话 commit 共用 */
    schedulePersist,
    windowFamily,
    heroMergedStyle,
    previewActor,
    clipPreviewActor,
  };
}
