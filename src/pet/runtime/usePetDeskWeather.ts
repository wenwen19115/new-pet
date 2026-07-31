import { type Ref } from "vue";
import {
  stopPetDeskWeather,
  syncPetDeskWeather,
} from "@/pet/bridge/deskWeather";
import type { DeskWeatherKind } from "@/pet/data/deskWeather";
import type { PetSettings } from "@/pet/data/types";

/** 传感轮询接线；睡醒 / 台词在 speakDeskWeather（对齐 USB）。 */
export function usePetDeskWeather(deps: {
  settings: Ref<PetSettings>;
  speaking: Ref<boolean>;
  isDragging: Ref<boolean>;
  onWeather: (kind: DeskWeatherKind) => boolean;
}) {
  function canFire() {
    if (deps.isDragging.value) return false;
    if (deps.speaking.value) return false;
    return true;
  }

  function refreshDeskWeather() {
    const cfg = deps.settings.value.deskWeather;
    syncPetDeskWeather({
      enabled: Boolean(cfg.enabled),
      getConfig: () => deps.settings.value.deskWeather,
      canFire,
      onWeather: deps.onWeather,
    });
  }

  function clearDeskWeather() {
    stopPetDeskWeather();
  }

  return {
    refreshDeskWeather,
    clearDeskWeather,
  };
}
