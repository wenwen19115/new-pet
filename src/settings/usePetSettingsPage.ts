import { onMounted } from "vue";
import type { AppUiTheme } from "@/theme/uiTheme";
import { createPetSettingsPageRuntime } from "./createPetSettingsPageRuntime";

type UsePetSettingsPageOptions = {
  onUiThemeChange?: (theme: AppUiTheme) => void;
};

export function usePetSettingsPage(opts: UsePetSettingsPageOptions = {}) {
  const { mountPage, view } = createPetSettingsPageRuntime(opts);
  onMounted(mountPage);
  return view;
}
