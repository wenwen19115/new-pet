import { onMounted } from "vue";
import type { PetThemeSettings } from "@/theme/types";
import { createPetSettingsPageRuntime } from "./createPetSettingsPageRuntime";

type UsePetSettingsPageOptions = {
  onThemeChange?: (theme: PetThemeSettings) => void;
};

export function usePetSettingsPage(opts: UsePetSettingsPageOptions = {}) {
  const { mountPage, view } = createPetSettingsPageRuntime(opts);
  onMounted(mountPage);
  return view;
}
