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

export function usePetSettingsPersist(deps: {
  settingsBag: Ref<PetSettings>;
  getCurrentSettings: () => PetSettings;
  modelKind: Ref<PetModelKind>;
  enabled: Ref<boolean>;
  settingsAlwaysOnTop: Ref<boolean>;
  sysStatsDefaultExpanded: Ref<boolean>;
  theme: Ref<PetThemeSettings>;
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
    deps.sysStatsDefaultExpanded.value = Boolean(incoming.sysStatsDefaultExpanded);
    if (incoming.theme) {
      deps.theme.value = clonePetThemeSettings(incoming.theme);
    }
    deps.settingsBag.value = incoming;
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
