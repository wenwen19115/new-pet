import { computed, nextTick, provide, ref } from "vue";
import { characterCapabilities } from "@/pet/characters";
import { loadPetSettings } from "@/pet/data/settings";
import { syncPetWindow } from "@/pet/windows/pet";
import type { PetSettings } from "@/pet/data/types";
import type { PetThemeSettings } from "@/theme/types";
import { registerBuiltinSettingsModules } from "./registerBuiltin";
import { PET_SETTINGS_PAGE_KEY } from "./context";
import {
  useChatAiDraft,
  useFormPicker,
  useTtsSettings,
  useVrmSettings,
  usePetSettingsHydrate,
  usePetSettingsFormState,
  usePetSettingsPersist,
  usePetSettingsActions,
  usePetSettingsViewModel,
  useSkyWeatherPreview,
} from "./composables";

type Options = {
  onThemeChange?: (theme: PetThemeSettings) => void;
};

export function createPetSettingsPageRuntime(opts: Options = {}) {
  registerBuiltinSettingsModules();

  const form = usePetSettingsFormState();
  const {
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
    hitBoundsEnabled,
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
    currentSettings: buildCurrentSettings,
  } = form;

  const settingsTab = ref("buddy");

  let applyLocalFromSettingsImpl = (_s: PetSettings) => {};
  let refreshVrmPreviewImpl: () => void | Promise<void> = async () => {};

  function getCurrentSettings() {
    return buildCurrentSettings({
      ttsEnabled,
      ttsVoiceUri,
      savedChatAi,
      vrmModelName,
      vrmModelRev,
    });
  }

  const persist = usePetSettingsPersist({
    settingsBag,
    getCurrentSettings,
    modelKind,
    settingsAlwaysOnTop,
    sysStatsDefaultExpanded,
    theme,
    applyLocalFromSettings: (s) => applyLocalFromSettingsImpl(s),
    refreshVrmPreview: () => refreshVrmPreviewImpl(),
  });

  const tts = useTtsSettings({ persistOnly: persist.invokePersistOnly });

  const {
    ttsEnabled,
    ttsVoiceUri,
    ttsVoiceOptions,
    refreshTtsVoiceOptions,
    applyTtsFromSettings,
    onTtsEnabled,
    onTtsVoice,
  } = tts;

  const chatAi = useChatAiDraft({ settingsBag, getCurrentSettings });
  const {
    chatAiProvider,
    chatAiApiKey,
    chatAiBaseUrl,
    chatAiModel,
    chatAiCustomModels,
    chatAiDirty,
    canAddChatAiModel,
    applyChatAiDraft,
    savedChatAi,
    onChatAiProvider,
    onChatAiModel,
    onChatAiAddModel,
    onChatAiRemoveModel,
    onChatAiSave,
    onChatAiReset,
  } = chatAi;

  const formPicker = useFormPicker({ modelKind, enabled, settingsTab });

  const vrm = useVrmSettings({
    modelKind,
    settingsBag,
    getCurrentSettings,
    persistAndSync: persist.invokePersistAndSync,
  });
  const {
    vrmModelName,
    vrmModelRev,
    vrmSrc,
    vrmBusy,
    isVrmPending,
    refreshVrmPreview,
    applyVrmFromSettings,
    onPickVrm,
    onClearVrm,
  } = vrm;

  const { applyLocalFromSettings } = usePetSettingsHydrate({
    settingsBag,
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
    hitBoundsEnabled,
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
    applyTtsFromSettings,
    applyChatAiDraft,
    applyVrmFromSettings,
    refreshTtsVoiceOptions,
    onThemeChange: opts.onThemeChange,
  });

  applyLocalFromSettingsImpl = applyLocalFromSettings;
  refreshVrmPreviewImpl = refreshVrmPreview;
  persist.wirePersistHandlers();

  function resetEphemeralUi() {
    previewAutoOrbit.value = false;
    editingCustomId.value = null;
    settingsTab.value = "buddy";
    vrmSrc.value = null;
    void nextTick(() => {
      formPicker.syncFormThumb(false);
    });
  }

  const actions = usePetSettingsActions({
    enabled,
    muted,
    chatEnabled,
    opacityPercent,
    zoomPercent,
    tone,
    demoMotion,
    modelKind,
    lookId,
    personality,
    usbWatchEnabled,
    randomIdleEnabled,
    playfulModeEnabled,
    hitBoundsEnabled,
    theme,
    sysStatsDefaultExpanded,
    customVrmMotions,
    editingCustomId,
    settingsBag,
    getCurrentSettings,
    applyLocalFromSettings,
    persistOnly: persist.persistOnly,
    persistAndSync: persist.persistAndSync,
    refreshVrmPreview,
    refreshTtsVoiceOptions,
    resetEphemeralUi,
    isVrmPending,
    onThemeChange: opts.onThemeChange,
  });

  const vm = usePetSettingsViewModel({
    enabled,
    modelKind,
    lookId,
    nickname,
    personality,
    theme,
    settingsTab,
    editingCustomId,
    customVrmMotions,
    vrmModelName,
    vrmSrc,
    savedChatAi,
  });

  const skyPreview = useSkyWeatherPreview({
    skyWeather,
    onPersist: () => persist.persistOnly(),
    themeStyle: computed(() => theme.value.style || "ukiyo"),
    model: computed(() => vm.activeLook.value.model),
    heroPanelStyle: vm.heroPanelStyle,
  });

  function onSettingsTab(id: string) {
    settingsTab.value = id;
    if (id !== "motion") editingCustomId.value = null;
  }

  function mountPage() {
    applyLocalFromSettings(loadPetSettings());
    void refreshVrmPreview();
    void syncPetWindow();
    void nextTick(() => {
      formPicker.syncFormThumb(false);
      if (enabled.value) formPicker.bindFormPickerRo();
    });
  }

  provide(PET_SETTINGS_PAGE_KEY, {
    enabled,
    muted,
    ttsEnabled,
    ttsVoiceUri,
    chatEnabled,
    chatAiProvider,
    chatAiApiKey,
    chatAiBaseUrl,
    chatAiModel,
    chatAiCustomModels,
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
    hitBoundsEnabled,
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
    canPreviewOrbit,
    vrmModelName,
    vrmBusy,
    isVrmPending,
    looks: vm.looks,
    formOptions: vm.formOptions,
    formPickerRef: formPicker.formPickerRef,
    formThumbStyle: formPicker.formThumbStyle,
    toneOptions: vm.toneOptions,
    ttsVoiceOptions,
    personalityOptions: vm.personalityOptions,
    themeStageModeOptions: vm.themeStageModeOptions,
    themeWallpaperFitOptions: vm.themeWallpaperFitOptions,
    bootDurationModeOptions: vm.bootDurationModeOptions,
    motionOptions: vm.motionOptions,
    motionPoolIds: vm.motionPoolIds,
    skinDefaultNickname: vm.skinDefaultNickname,
    lookLabel: vm.lookLabel,
    capabilities: computed(() => characterCapabilities(modelKind.value)),
    onEnabled: actions.onEnabled,
    onModel: actions.onModel,
    onLook: actions.onLook,
    onSaveNickname: actions.onSaveNickname,
    onPersonality: actions.onPersonality,
    onResetProfile: actions.onResetProfile,
    onFactoryReset: actions.onFactoryReset,
    onClearCache: actions.onClearCache,
    onMuted: actions.onMuted,
    onTtsEnabled,
    onTtsVoice,
    onChatEnabled: actions.onChatEnabled,
    onChatAiProvider,
    onChatAiModel,
    onChatAiAddModel,
    onChatAiRemoveModel,
    onChatAiSave,
    onChatAiReset,
    chatAiDirty,
    canAddChatAiModel,
    onOpacity: actions.onOpacity,
    onZoom: actions.onZoom,
    resetOpacity: actions.resetOpacity,
    resetZoom: actions.resetZoom,
    onTone: actions.onTone,
    onUsbWatch: actions.onUsbWatch,
    onRandomIdle: actions.onRandomIdle,
    onPlayfulMode: actions.onPlayfulMode,
    onHitBounds: actions.onHitBounds,
    onDeskWeatherChange: () => persist.persistOnly(),
    onSkyWeatherChange: () => persist.persistOnly(),
    onPickVrm,
    onClearVrm,
    onDemoMotion: actions.onDemoMotion,
    onPlayMotion: actions.onPlayMotion,
    onThemeStyle: actions.onThemeStyle,
    onThemeStageMode: actions.onThemeStageMode,
    onThemeWallpaperDim: actions.onThemeWallpaperDim,
    onBubbleOpacity: actions.onBubbleOpacity,
    onThemeWallpaperFit: actions.onThemeWallpaperFit,
    onPickThemeWallpaper: actions.onPickThemeWallpaper,
    onClearThemeWallpaper: actions.onClearThemeWallpaper,
    onThemeWallpaperMuted: actions.onThemeWallpaperMuted,
    onBootAnimationEnabled: actions.onBootAnimationEnabled,
    onBootAnimationMuted: actions.onBootAnimationMuted,
    onBootAnimationFit: actions.onBootAnimationFit,
    onPickBootAnimation: actions.onPickBootAnimation,
    onClearBootAnimation: actions.onClearBootAnimation,
    onBootAnimationDurationMode: actions.onBootAnimationDurationMode,
    onBootAnimationDurationSec: actions.onBootAnimationDurationSec,
    onSettingsPin: persist.onSettingsPin,
    onSysStatsDefaultExpanded: actions.onSysStatsDefaultExpanded,
    persistOnly: persist.persistOnly,
    persistCustomMotions: actions.persistCustomMotions,
    onAddCustomMotion: actions.onAddCustomMotion,
    toggleEditCustom: actions.toggleEditCustom,
    onCustomMotionBoneChange: actions.onCustomMotionBoneChange,
    onRemoveCustomMotion: actions.onRemoveCustomMotion,
    onPlayCustomMotion: actions.onPlayCustomMotion,
  });

  return {
    mountPage,
    view: {
      enabled,
      tone,
      previewAutoOrbit,
      canPreviewOrbit,
      effectivePreviewAutoOrbit,
      settingsTab,
      settingsTabs: vm.settingsTabs,
      activeModule: vm.activeModule,
      activeTabTitle: vm.activeTabTitle,
      onSettingsTab,
      activeLook: vm.activeLook,
      v: vm.v,
      vrmModelRev,
      vrmSrc,
      customVrmMotions,
      previewMotionOverride: vm.previewMotionOverride,
      previewAutoIdleClips: vm.previewAutoIdleClips,
      previewHint: vm.previewHint,
      displayName: vm.displayName,
      heroPanelStyle: vm.heroPanelStyle,
      personalityLabel: vm.personalityLabel,
      themeBanner: vm.themeBanner,
      heroMergedStyle: skyPreview.heroMergedStyle,
      skyDisplayTod: skyPreview.skyDisplayTod,
      skyDisplayWeather: skyPreview.skyDisplayWeather,
      skyRainbow: skyPreview.skyRainbow,
      skyEvents: skyPreview.skyEvents,
      skyFollowClock: skyPreview.skyFollowClock,
      windowFamily: skyPreview.windowFamily,
      previewActor: skyPreview.previewActor,
      clipPreviewActor: skyPreview.clipPreviewActor,
    },
  };
}
