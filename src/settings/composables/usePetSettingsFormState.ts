import { computed, ref, watch, type Ref } from "vue";
import { loadPetSettings, patchActiveProfile } from "@/pet/data/settings";
import type { PetSettings, PetTone } from "@/pet/data/types";
import type { PetModelKind } from "@/pet/skins";
import type { PetPersonality } from "@/pet/content/dialogue/personality";
import {
  isCustomVrmMotionId,
  normalizeCustomVrmMotions,
  type CustomVrmMotion,
} from "@/pet/content/motion/customVrmMotions";
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
  /** 调骨骼时预览冻结的关键帧下标 */
  const editingCustomFrame = ref(0);
  /** 「做一下」时设置页预览临时播放的动作 id */
  const previewPlayMotion = ref<string | null>(null);
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
    const savedMotions = normalizeCustomVrmMotions(
      settingsBag.value.customVrmMotions
    );
    const savedMotionIds = new Set(savedMotions.map((m) => m.id));
    // 未保存的自定义动作 id 不要写进其它设置的落盘包
    let persistedDemo = demoMotion.value;
    if (
      isCustomVrmMotionId(persistedDemo) &&
      !savedMotionIds.has(persistedDemo)
    ) {
      persistedDemo = settingsBag.value.demoMotion;
    }
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
      demoMotion: persistedDemo,
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
      // 自定义动作与陪聊 AI 一样：表单是草稿，其它 persist 只用已保存值
      customVrmMotions: savedMotions,
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
    editingCustomFrame,
    previewPlayMotion,
    previewAutoOrbit,
    settingsBag,
    canPreviewOrbit,
    effectivePreviewAutoOrbit,
    currentSettings,
  };
}
