import { shallowRef } from "vue";
import type { PetSettings } from "./types";
import { loadPetSettings } from "./settings";

const settingsRef = shallowRef<PetSettings>(loadPetSettings());

export function notifyPetStoreFromSave(next: PetSettings): void {
  settingsRef.value = next;
}

/** Non-Vue helper for PetApp / bridges */
export const petStore = {
  get settings() {
    return settingsRef.value;
  },
  setSettings(next: PetSettings) {
    settingsRef.value = next;
  },
  reload() {
    settingsRef.value = loadPetSettings();
    return settingsRef.value;
  },
};
