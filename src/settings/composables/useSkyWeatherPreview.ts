/**
 * 设置左侧窗外天气预览：会话 + hero 绑定。
 * 生命周期跟设置页；persist 走调用方门控。
 */
import { computed, type ComputedRef, type Ref } from "vue";
import { characterHas, getCharacter } from "@/pet/characters";
import type { PetModelKind } from "@/pet/skins";
import {
  DEFAULT_SKY_WEATHER,
  normalizeSkyWeather,
  type SkyWeatherConfig,
} from "@/pet/data/skyWeather";
import { useSkyWeatherSession } from "@/pet/runtime/useSkyWeatherSession";
import {
  familyToneVars,
  themePackToFamily,
} from "@/pet/models/preview/themePackToFamily";

export function useSkyWeatherPreview(opts: {
  skyWeather: Ref<SkyWeatherConfig>;
  onPersist: () => void | Promise<void>;
  themeStyle: Ref<string> | ComputedRef<string>;
  model: Ref<PetModelKind> | ComputedRef<PetModelKind>;
  heroPanelStyle: Ref<Record<string, string>> | ComputedRef<Record<string, string>>;
}) {
  const skyConfig = computed({
    get: () => opts.skyWeather.value ?? DEFAULT_SKY_WEATHER,
    set: (next: SkyWeatherConfig) => {
      opts.skyWeather.value = next;
    },
  });

  const session = useSkyWeatherSession({
    config: skyConfig,
    commit: (next, commitOpts) => {
      skyConfig.value = normalizeSkyWeather(next);
      if (commitOpts?.persist === false) return;
      void opts.onPersist();
    },
  });

  const windowFamily = computed(() =>
    themePackToFamily(opts.themeStyle.value || "ukiyo")
  );

  const skyFollowClock = computed(
    () => (opts.skyWeather.value?.todMode ?? "offline") === "sync"
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

  return {
    skyDisplayTod: session.displayTod,
    skyDisplayWeather: session.displayWeather,
    skyRainbow: session.rainbowActive,
    skyEvents: session.activeEvents,
    skyFollowClock,
    windowFamily,
    heroMergedStyle,
    previewActor,
    clipPreviewActor,
  };
}
