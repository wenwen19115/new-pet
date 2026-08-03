import { computed, onMounted, onUnmounted, ref } from "vue";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { loadPetSettings } from "@/pet/data/settings";
import { PET_SETTINGS_EVENT } from "@/pet/events";
import type { PetSettings } from "@/pet/data/types";
import { themeRootStyle } from "./applyTheme";
import {
  clonePetThemeSettings,
  type PetThemeSettings,
} from "./types";

/** 独立 WebView 只跟 theme.style，勿 paintDocumentBackdrop。 */
export function usePetWindowTheme() {
  const theme = ref<PetThemeSettings>(
    clonePetThemeSettings(loadPetSettings().theme)
  );
  const themeVars = computed(() => themeRootStyle(theme.value));

  let unlisten: UnlistenFn | null = null;

  function applyTheme(next: PetThemeSettings | undefined) {
    if (!next) return;
    theme.value = clonePetThemeSettings(next);
  }

  onMounted(async () => {
    applyTheme(loadPetSettings().theme);
    try {
      unlisten = await listen<PetSettings>(PET_SETTINGS_EVENT, (ev) => {
        applyTheme(ev.payload?.theme);
      });
    } catch {
      // ignore
    }
  });

  onUnmounted(() => {
    unlisten?.();
    unlisten = null;
  });

  return { theme, themeVars };
}
