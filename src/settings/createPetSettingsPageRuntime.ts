import { computed, nextTick, provide, ref } from "vue";
import { characterCapabilities } from "@/pet/characters";
import { loadPetSettings } from "@/pet/data/settings";
import { syncPetWindow } from "@/pet/windows/pet";
import type { PetSettings } from "@/pet/data/types";
import type { AppUiTheme } from "@/theme/uiTheme";
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
} from "./composables";

type Options = {
  onUiThemeChange?: (theme: AppUiTheme) => void;
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
    hitBoundsEnabled,
    catchphrases,
    catchphraseChance,
    uiTheme,
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
    uiTheme,
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
    hitBoundsEnabled,
    catchphrases,
    catchphraseChance,
    uiTheme,
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
    onUiThemeChange: opts.onUiThemeChange,
  });

  applyLocalFromSettingsImpl = applyLocalFromSettings;
  refreshVrmPreviewImpl = refreshVrmPreview;
  persist.wirePersistHandlers();

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
    hitBoundsEnabled,
    uiTheme,
    sysStatsDefaultExpanded,
    customVrmMotions,
    editingCustomId,
    settingsBag,
    getCurrentSettings,
    applyLocalFromSettings,
    persistOnly: persist.persistOnly,
    persistAndSync: persist.persistAndSync,
    refreshVrmPreview,
    isVrmPending,
    onUiThemeChange: opts.onUiThemeChange,
  });

  const vm = usePetSettingsViewModel({
    enabled,
    modelKind,
    lookId,
    nickname,
    personality,
    uiTheme,
    settingsTab,
    editingCustomId,
    customVrmMotions,
    vrmModelName,
    vrmSrc,
    savedChatAi,
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
    hitBoundsEnabled,
    catchphrases,
    catchphraseChance,
    uiTheme,
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
    uiThemeOptions: vm.uiThemeOptions,
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
    onHitBounds: actions.onHitBounds,
    onPickVrm,
    onClearVrm,
    onDemoMotion: actions.onDemoMotion,
    onPlayMotion: actions.onPlayMotion,
    onUiTheme: actions.onUiTheme,
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
    },
  };
}
