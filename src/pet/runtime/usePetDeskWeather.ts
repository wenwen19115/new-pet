import { type Ref } from "vue";
import type { DeskWeatherKind } from "@/pet/data/deskWeather";
import type { PetSettings } from "@/pet/data/types";
import {
  stopPetDeskWeather,
  syncPetDeskWeather,
} from "./deskWeatherPoll";

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
      enabled: cfg.enabled,
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
