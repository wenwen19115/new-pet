import type { Ref } from "vue";
import { hidePetChat } from "@/pet/windows/chat";
import { petStore } from "@/pet/data/store";
import { isSettingsStorageKey, writeSettingsRaw } from "@/pet/data/storageKeys";
import { loadPetSettings, normalizePetSettings, publishPetSettings } from "@/pet/data/settings";
import { cancelPetTts } from "@/pet/bridge/tts";
import { resolveAppearance } from "@/pet/skins";
import {
  clearedPetVrmMeta,
  resolveNamedPetVrmSrc,
} from "@/pet/data/vrmStorage";
import type { PetSettings } from "@/pet/data/types";

/** Settings apply, VRM refresh, and cross-webview storage sync. */
export function usePetSettingsSync(deps: {
  settings: Ref<PetSettings>;
  vrmSrc: Ref<string | null>;
  hostAlive: () => boolean;
  getChatPausesRandomIdle: () => boolean;
  getActiveSkinId: () => string;
  getActiveSkinModel: () => string;
  refreshUsbWatch: () => void;
  resizePetWindow: () => void | Promise<void>;
  setIdleActionTimer: (id: number | null) => void;
  scheduleIdleAction: () => void;
  speakIntro: () => void | Promise<void>;
}) {
  async function refreshVrmSrc() {
    const { src, stale } = await resolveNamedPetVrmSrc(
      deps.settings.value.vrmModelName,
      deps.settings.value.vrmModelRev
    );
    deps.vrmSrc.value = src;
    if (!stale) return;
    try {
      const next = await publishPetSettings({
        ...deps.settings.value,
        ...clearedPetVrmMeta(),
      });
      deps.settings.value = next;
      const { syncPetWindow } = await import("@/pet/windows/pet");
      await syncPetWindow();
    } catch (err) {
      console.warn("[pet] clear stale vrm meta failed", err);
    }
  }

  function applySettings(
    next: PetSettings | Partial<PetSettings>,
    options?: { introIfSkinChanged?: boolean }
  ) {
    const prevId = deps.getActiveSkinId();
    const prevModel = deps.getActiveSkinModel();
    const prevZoom = deps.settings.value.zoomPercent;
    const prevUsb = deps.settings.value.usbWatchEnabled;
    const prevRandomIdle = deps.settings.value.randomIdleEnabled;
    const prevVrmName = deps.settings.value.vrmModelName;
    const prevVrmRev = deps.settings.value.vrmModelRev;
    deps.settings.value = normalizePetSettings(next);
    petStore.setSettings(deps.settings.value);
    try {
      writeSettingsRaw(JSON.stringify(deps.settings.value));
    } catch {
      // ignore
    }
    if (deps.settings.value.muted || !deps.settings.value.ttsEnabled) {
      cancelPetTts();
    }
    if (!deps.settings.value.chatEnabled) {
      void hidePetChat();
    }
    const nextLook = resolveAppearance(
      deps.settings.value.modelKind,
      deps.settings.value.lookId
    );
    if (options?.introIfSkinChanged && nextLook.id !== prevId) {
      void deps.speakIntro();
    }
    if (deps.hostAlive() && deps.settings.value.usbWatchEnabled !== prevUsb) {
      deps.refreshUsbWatch();
    }
    if (deps.hostAlive() && deps.settings.value.randomIdleEnabled !== prevRandomIdle) {
      if (deps.settings.value.randomIdleEnabled && !deps.getChatPausesRandomIdle()) {
        deps.scheduleIdleAction();
      } else {
        deps.setIdleActionTimer(null);
      }
    }
    if (
      deps.hostAlive() &&
      (deps.settings.value.vrmModelName !== prevVrmName ||
        deps.settings.value.vrmModelRev !== prevVrmRev)
    ) {
      void refreshVrmSrc();
    }
    if (
      nextLook.model !== prevModel ||
      deps.settings.value.zoomPercent !== prevZoom
    ) {
      void deps.resizePetWindow();
    }
  }

  function onStorage(ev: StorageEvent) {
    if (!isSettingsStorageKey(ev.key) || !ev.newValue) return;
    try {
      applySettings(JSON.parse(ev.newValue) as Partial<PetSettings>, {
        introIfSkinChanged: true,
      });
    } catch {
      // ignore
    }
  }

  return { refreshVrmSrc, applySettings, onStorage };
}
