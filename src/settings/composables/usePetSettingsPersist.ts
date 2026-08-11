import { onBeforeUnmount, onMounted, type Ref } from "vue";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { applySettingsWindowPin } from "@/pet";
import { publishPetSettings } from "@/pet/data/settings";
import { PET_SETTINGS_EVENT } from "@/pet/events";
import type { PetSettings } from "@/pet/data/types";
import type { PetModelKind } from "@/pet/skins";
import {
  clonePetThemeSettings,
  type PetThemeSettings,
} from "@/theme/types";
import { syncPetWindow } from "@/pet/windows/pet";
import { isSettingsStorageKey } from "@/pet/data/storageKeys";
import {
  normalizeSkyWeather,
  type SkyWeatherConfig,
} from "@/pet/data/skyWeather";

export function usePetSettingsPersist(deps: {
  settingsBag: Ref<PetSettings>;
  getCurrentSettings: () => PetSettings;
  modelKind: Ref<PetModelKind>;
  enabled: Ref<boolean>;
  settingsAlwaysOnTop: Ref<boolean>;
  sysStatsDefaultExpanded: Ref<boolean>;
  theme: Ref<PetThemeSettings>;
  /** 窗外天气表单 SoT；桌宠 leader 落盘后跟盘，避免预览脱节 */
  skyWeather?: Ref<SkyWeatherConfig>;
  /** 本页天气防抖未落盘时，勿用桌宠包盖掉总闸草稿 */
  skyPersistPending?: () => boolean;
  applyLocalFromSettings: (s: PetSettings) => void;
  refreshVrmPreview: () => void | Promise<void>;
}) {
  let persistAndSyncImpl = async () => {};
  let persistOnlyImpl = async () => {};

  function wirePersistHandlers() {
    persistAndSyncImpl = async () => {
      const next = await publishPetSettings(deps.getCurrentSettings());
      deps.settingsBag.value = next;
      await syncPetWindow();
    };

    persistOnlyImpl = async () => {
      const next = await publishPetSettings(deps.getCurrentSettings());
      deps.settingsBag.value = next;
    };
  }

  async function persistAndSync() {
    await persistAndSyncImpl();
  }

  async function persistOnly() {
    await persistOnlyImpl();
  }

  let unlistenSettings: UnlistenFn | null = null;

  function applyPartialIncoming(incoming: PetSettings) {
    deps.enabled.value = Boolean(incoming.enabled);
    deps.settingsAlwaysOnTop.value = Boolean(incoming.settingsAlwaysOnTop);
    deps.sysStatsDefaultExpanded.value = Boolean(
      incoming.sysStatsDefaultExpanded
    );
    if (incoming.theme) {
      deps.theme.value = clonePetThemeSettings(incoming.theme);
    }
    deps.settingsBag.value = incoming;
    syncSkyWeatherFromIncoming(incoming);
  }

  /** 桌宠落盘 → 设置页 sky 表单。投射开关始终跟盘，避免本页旧 true 被其它 persist 写回。 */
  function syncSkyWeatherFromIncoming(incoming: PetSettings) {
    if (!deps.skyWeather || !incoming.skyWeather) return;
    const next = normalizeSkyWeather(incoming.skyWeather);
    const cur = normalizeSkyWeather(deps.skyWeather.value);
    // 投射字段跟盘；关投射后本页仍是 tick leader，不再用桌宠 runtime 盖表单
    const base = normalizeSkyWeather({
      ...cur,
      enableOnPet: next.enableOnPet,
      bgOpacity: next.bgOpacity,
      hideableOnPet: next.hideableOnPet,
      hideEffectOnPet: next.hideEffectOnPet,
    });
    if (!next.enableOnPet) {
      deps.skyWeather.value = base;
      return;
    }
    if (deps.skyPersistPending?.()) {
      if (
        base.runtime.geoOnline === next.runtime.geoOnline &&
        base.runtime.locatedRegionId === next.runtime.locatedRegionId
      ) {
        deps.skyWeather.value = base;
        return;
      }
      deps.skyWeather.value = normalizeSkyWeather({
        ...base,
        runtime: {
          ...base.runtime,
          geoOnline: next.runtime.geoOnline,
          locatedRegionId: next.runtime.locatedRegionId,
        },
      });
      return;
    }
    if (
      base.linkMode !== next.linkMode ||
      base.todMode !== next.todMode ||
      base.weatherMode !== next.weatherMode ||
      base.regionId !== next.regionId
    ) {
      // 总闸/模式本地已改、桌宠包尚旧：只并显示相关字段
      deps.skyWeather.value = normalizeSkyWeather({
        ...base,
        manualTod: next.manualTod,
        manualWeather: next.manualWeather,
        runtime: next.runtime,
      });
      return;
    }
    deps.skyWeather.value = next;
  }

  function onIncomingSettings(incoming: PetSettings) {
    if (incoming.modelKind !== deps.modelKind.value) {
      deps.applyLocalFromSettings(incoming);
      void deps.refreshVrmPreview();
      return;
    }
    applyPartialIncoming(incoming);
  }

  function onSettingsStorage(ev: StorageEvent) {
    if (!isSettingsStorageKey(ev.key) || !ev.newValue) return;
    try {
      const incoming = JSON.parse(ev.newValue) as PetSettings;
      onIncomingSettings(incoming);
    } catch {
      // ignore
    }
  }

  onMounted(() => {
    void listen<PetSettings>(PET_SETTINGS_EVENT, (event) => {
      if (!event.payload) return;
      onIncomingSettings(event.payload);
    }).then((fn) => {
      unlistenSettings = fn;
    });

    window.addEventListener("storage", onSettingsStorage);
  });

  onBeforeUnmount(() => {
    unlistenSettings?.();
    unlistenSettings = null;
    window.removeEventListener("storage", onSettingsStorage);
  });

  async function onSettingsPin(checked: unknown) {
    deps.settingsAlwaysOnTop.value = Boolean(checked);
    await persistOnly();
    await applySettingsWindowPin(deps.settingsAlwaysOnTop.value);
  }

  function invokePersistOnly() {
    return persistOnlyImpl();
  }

  function invokePersistAndSync() {
    return persistAndSyncImpl();
  }

  return {
    persistOnly,
    persistAndSync,
    invokePersistOnly,
    invokePersistAndSync,
    wirePersistHandlers,
    onSettingsPin,
  };
}
