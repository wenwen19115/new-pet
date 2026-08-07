import { computed, ref, watch, type Ref } from "vue";
import { loadPetSettings, patchActiveProfile } from "@/pet/data/settings";
import type { PetSettings, PetTone } from "@/pet/data/types";
import type { PetModelKind } from "@/pet/skins";
import type { PetPersonality } from "@/pet/content/dialogue/personality";
import type { CustomVrmMotion } from "@/pet/content/motion/customVrmMotions";
import type { PetCustomLine } from "@/pet/content/dialogue/customLines";
import {
  DEFAULT_PET_THEME_SETTINGS,
  clonePetThemeSettings,
  type PetThemeSettings,
} from "@/theme/types";
import { characterCapabilities } from "@/pet/characters";
import {
  CATCHPHRASE_DEFAULT_CHANCE,
  clampCatchphraseChance,
} from "@/pet/content/dialogue/catchphrases";
import type { PetChatAiConfig } from "@/pet/chat/providers";
import {
  DEFAULT_DESK_WEATHER,
  normalizeDeskWeather,
  type DeskWeatherConfig,
} from "@/pet/data/deskWeather";
import {
  DEFAULT_SKY_WEATHER,
  normalizeSkyWeather,
  type SkyWeatherConfig,
} from "@/pet/data/skyWeather";

export function usePetSettingsFormState() {
  const enabled = ref(false);
  const muted = ref(false);
  const chatEnabled = ref(true);
  const opacityPercent = ref(100);
  const zoomPercent = ref(0);
  const tone = ref<PetTone>("cute");
  const demoMotion = ref<string>("fly-orbit");
  const modelKind = ref<PetModelKind>("chip");
  const lookId = ref("cyan");
  const nickname = ref("");
  const personality = ref<PetPersonality>("sunny");
  const usbWatchEnabled = ref(true);
  const randomIdleEnabled = ref(true);
  const playfulModeEnabled = ref(false);
  const deskWeather = ref<DeskWeatherConfig>(
    normalizeDeskWeather(DEFAULT_DESK_WEATHER)
  );
  const skyWeather = ref<SkyWeatherConfig>(
    normalizeSkyWeather(DEFAULT_SKY_WEATHER)
  );
  const catchphrases = ref<string[]>([]);
  const catchphraseChance = ref(CATCHPHRASE_DEFAULT_CHANCE);
  const theme = ref<PetThemeSettings>(
    clonePetThemeSettings(DEFAULT_PET_THEME_SETTINGS)
  );
  const settingsAlwaysOnTop = ref(false);
  const sysStatsDefaultExpanded = ref(false);
  const customVrmMotions = ref<CustomVrmMotion[]>([]);
  const customLines = ref<PetCustomLine[]>([]);
  const customLinesOnly = ref(false);
  const disabledMotions = ref<string[]>([]);
  const disabledBuiltInLines = ref<string[]>([]);
  const editingCustomId = ref<string | null>(null);
  const previewAutoOrbit = ref(false);
  const settingsBag = ref<PetSettings>(loadPetSettings());

  const canPreviewOrbit = computed(() =>
    characterCapabilities(modelKind.value).has("preview-orbit")
  );
  const effectivePreviewAutoOrbit = computed(
    () => canPreviewOrbit.value && previewAutoOrbit.value
  );

  watch(canPreviewOrbit, (ok) => {
    if (!ok) previewAutoOrbit.value = false;
  });

  function currentSettings(deps: {
    ttsEnabled: Ref<boolean>;
    ttsVoiceUri: Ref<string>;
    savedChatAi: () => PetChatAiConfig;
    vrmModelName: Ref<string>;
    vrmModelRev: Ref<number>;
  }): PetSettings {
    const base: PetSettings = {
      ...settingsBag.value,
      enabled: enabled.value,
      muted: muted.value,
      ttsEnabled: deps.ttsEnabled.value,
      ttsVoiceUri: deps.ttsVoiceUri.value,
      chatEnabled: chatEnabled.value,
      chatAi: deps.savedChatAi(),
      opacity: opacityPercent.value / 100,
      tone: tone.value,
      demoMotion: demoMotion.value,
      modelKind: modelKind.value,
      lookId: lookId.value,
      nickname: nickname.value.trim(),
      personality: personality.value,
      zoomPercent: zoomPercent.value,
      usbWatchEnabled: usbWatchEnabled.value,
      randomIdleEnabled: randomIdleEnabled.value,
      playfulModeEnabled: playfulModeEnabled.value,
      deskWeather: normalizeDeskWeather(deskWeather.value),
      skyWeather: normalizeSkyWeather(skyWeather.value),
      catchphrases: catchphrases.value.map((t) => t.trim()).filter(Boolean),
      catchphraseChance: clampCatchphraseChance(catchphraseChance.value),
      theme: clonePetThemeSettings(theme.value),
      settingsAlwaysOnTop: settingsAlwaysOnTop.value,
      sysStatsDefaultExpanded: sysStatsDefaultExpanded.value,
      customVrmMotions: customVrmMotions.value.map((m) => ({ ...m })),
      vrmModelName: deps.vrmModelName.value,
      vrmModelRev: deps.vrmModelRev.value,
    };
    return patchActiveProfile(base, {
      customLines: customLines.value.map((l) => ({ ...l })),
      customLinesOnly: customLinesOnly.value,
      disabledMotions: [...disabledMotions.value],
      disabledBuiltInLines: [...disabledBuiltInLines.value],
    });
  }

  return {
    enabled,
    muted,
    chatEnabled,
    opacityPercent,
    zoomPercent,
    tone,
    demoMotion,
    modelKind,
    lookId,
    nickname,
    personality,
    usbWatchEnabled,
    randomIdleEnabled,
    playfulModeEnabled,
    deskWeather,
    skyWeather,
    catchphrases,
    catchphraseChance,
    theme,
    settingsAlwaysOnTop,
    sysStatsDefaultExpanded,
    customVrmMotions,
    customLines,
    customLinesOnly,
    disabledMotions,
    disabledBuiltInLines,
    editingCustomId,
    previewAutoOrbit,
    settingsBag,
    canPreviewOrbit,
    effectivePreviewAutoOrbit,
    currentSettings,
  };
}
