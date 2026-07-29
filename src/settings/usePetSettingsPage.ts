import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from "vue";
import { message } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { isPetIdleMotion } from "@/pet/content/motions";
import {
  applySettingsWindowPin,
  requestPetIntro,
  requestPetMotion,
} from "@/pet";
import {
  loadPetSettings,
  publishPetSettings,
  resetActiveModelProfile,
  switchPetModel,
  patchActiveProfile,
} from "@/pet/data/settings";
import { PET_CHAT_PROVIDERS } from "@/pet/chat/providers";
import { syncPetWindow } from "@/pet/windows/pet";
import {
  isPetModelKind,
  listPetLooksForModel,
  resolveAppearance,
  resolveNickname,
  type PetModelKind,
} from "@/pet/skins";
import {
  isPetPersonality,
  type PetPersonality,
} from "@/pet/content/personality";
import type { PetSettings, PetTone } from "@/pet/data/types";
import { PET_SETTINGS_EVENT } from "@/pet/data/types";
import {
  createEmptyCustomVrmMotion,
  isCustomVrmMotionId,
  type CustomVrmMotion,
} from "@/pet/content/customVrmMotions";
import type { PetCustomLine } from "@/pet/content/customLines";
import { isAppUiTheme, type AppUiTheme } from "@/theme/uiTheme";
import { listCharacters, characterCapabilities, getCharacter, characterHas } from "@/pet/characters";
import { demoMotionOptions } from "@/pet/content/motionPlayer";
import {
  registerBuiltinSettingsModules,
} from "./registerBuiltin";
import { listSettingsModules } from "./registry";
import type { SettingsModule } from "./registry";
import {
  PET_SETTINGS_PAGE_KEY,
  type PetSettingsPageCtx,
} from "./context";
import { isSettingsStorageKey } from "@/pet/data/storageKeys";
import {
  CATCHPHRASE_DEFAULT_CHANCE,
  clampCatchphraseChance,
} from "@/pet/content/catchphrases";
import {
  useChatAiDraft,
  useFormPicker,
  useTtsSettings,
  useVrmSettings,
  usePetSettingsHydrate,
} from "./composables";

type UsePetSettingsPageOptions = {
  onUiThemeChange?: (theme: AppUiTheme) => void;
};

export function usePetSettingsPage(opts: UsePetSettingsPageOptions = {}) {
  registerBuiltinSettingsModules();
  const { t } = useI18n();

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
  const hitBoundsEnabled = ref(true);
  const catchphrases = ref<string[]>([]);
  const catchphraseChance = ref(CATCHPHRASE_DEFAULT_CHANCE);
  const uiTheme = ref<AppUiTheme>("night");
  const settingsAlwaysOnTop = ref(false);
  const sysStatsDefaultExpanded = ref(false);
  const customVrmMotions = ref<CustomVrmMotion[]>([]);
  const customLines = ref<PetCustomLine[]>([]);
  const customLinesOnly = ref(false);
  const disabledMotions = ref<string[]>([]);
  const disabledBuiltInLines = ref<string[]>([]);
  const editingCustomId = ref<string | null>(null);
  const previewAutoOrbit = ref(false);
  const canPreviewOrbit = computed(() =>
    characterCapabilities(modelKind.value).has("preview-orbit")
  );
  const effectivePreviewAutoOrbit = computed(
    () => canPreviewOrbit.value && previewAutoOrbit.value
  );

  watch(canPreviewOrbit, (ok) => {
    if (!ok) previewAutoOrbit.value = false;
  });

  type SettingsTabId = string;
  const settingsTab = ref<SettingsTabId>("buddy");
  const settingsBag = ref<PetSettings>(loadPetSettings());

  let persistAndSyncImpl = async () => {};
  let persistOnlyImpl = async () => {};
  const getCurrentSettings = () => currentSettings();

  const {
    ttsEnabled,
    ttsVoiceUri,
    ttsVoiceOptions,
    refreshTtsVoiceOptions,
    applyTtsFromSettings,
    onTtsEnabled,
    onTtsVoice,
  } = useTtsSettings({ persistOnly: () => persistOnlyImpl() });

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
  } = useChatAiDraft({ settingsBag, getCurrentSettings });

  const {
    formPickerRef,
    formThumbStyle,
    syncFormThumb,
    bindFormPickerRo,
  } = useFormPicker({ modelKind, enabled, settingsTab });

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
  } = useVrmSettings({
    modelKind,
    settingsBag,
    getCurrentSettings,
    persistAndSync: () => persistAndSyncImpl(),
  });

  const uiThemeOptions = computed(() => [
    { label: t("pet.uiThemeNight"), value: "night" },
    { label: t("pet.uiThemeDay"), value: "day" },
  ]);

  const moduleCtx = computed(() => ({
    enabled: enabled.value,
    modelKind: modelKind.value,
    capabilities: characterCapabilities(modelKind.value),
    vrmUploaded: Boolean(vrmModelName.value.trim()),
  }));

  const settingsModules = computed(() =>
    listSettingsModules(moduleCtx.value)
  );

  const settingsTabs = computed(() =>
    settingsModules.value.map((m) => ({
      id: m.id,
      label: t(m.labelKey),
      icon: m.icon,
    }))
  );

  const activeModule = computed<SettingsModule | undefined>(() =>
    settingsModules.value.find((m) => m.id === settingsTab.value) ??
    settingsModules.value[0]
  );

  const activeTabTitle = computed(() => {
    const mod = activeModule.value;
    if (!mod) return "";
    const base = t(mod.labelKey);
    if (mod.id !== "chat") return base;
    const saved = savedChatAi();
    const provider =
      PET_CHAT_PROVIDERS[saved.provider] ?? PET_CHAT_PROVIDERS.local;
    return `${base} · ${t(provider.labelKey)}`;
  });

  const previewMotionOverride = computed(() =>
    editingCustomId.value &&
    characterHas(modelKind.value, "vrm-bone-editor")
      ? editingCustomId.value
      : null
  );

  const previewAutoIdleClips = computed(
    () =>
      settingsTab.value !== "motion" &&
      !editingCustomId.value &&
      !previewMotionOverride.value
  );

  function onSettingsTab(id: SettingsTabId) {
    settingsTab.value = id;
    if (id !== "motion") editingCustomId.value = null;
  }

  const looks = computed(() => listPetLooksForModel(modelKind.value));

  function lookLabel(theme: { nameKey: string; toonNameKey?: string }) {
    const policy = getCharacter(modelKind.value).appearance;
    if (policy.nameFrom === "look-toon" && theme.toonNameKey) {
      return t(theme.toonNameKey);
    }
    return t(theme.nameKey);
  }

  const toneOptions = computed(() => [
    { label: t("pet.toneCute"), value: "cute" },
    { label: t("pet.toneSnarky"), value: "snarky" },
  ]);

  const personalityOptions = computed(() => [
    { label: t("pet.personalitySunny"), value: "sunny" },
    { label: t("pet.personalityShy"), value: "shy" },
    { label: t("pet.personalityCool"), value: "cool" },
    { label: t("pet.personalityFiery"), value: "fiery" },
  ]);

  const formOptions = computed(() =>
    listCharacters().map((c) => ({
      label: t(c.form.nameKey),
      value: c.id,
    }))
  );

  const motionOptions = computed(() =>
    demoMotionOptions(modelKind.value, customVrmMotions.value).map((o) => ({
      value: o.value,
      label: o.label ?? (o.labelKey ? t(o.labelKey) : o.value),
    }))
  );

  const motionPoolIds = computed(
    () => [...getCharacter(modelKind.value).demoMotions] as string[]
  );

  const activeLook = computed(() =>
    resolveAppearance(modelKind.value, lookId.value)
  );

  const previewHint = computed(() => {
    const character = getCharacter(activeLook.value.model);
    if (
      characterHas(activeLook.value.model, "vrm-upload") &&
      (!vrmModelName.value.trim() || !vrmSrc.value)
    ) {
      return t("pet.previewVrmUploadHint");
    }
    return t(character.previewHintKey);
  });

  const skinDefaultNickname = computed(() => activeLook.value.defaultNickname);
  const displayName = computed(() =>
    resolveNickname(nickname.value, activeLook.value)
  );
  const v = computed(() => activeLook.value.visual);

  const heroPanelStyle = computed(() => {
    const vis = v.value;
    const day = uiTheme.value === "day";
    const base = day
      ? `linear-gradient(165deg, rgba(255, 252, 248, 0.92), rgba(244, 241, 234, 0.96))`
      : `linear-gradient(165deg, rgba(16, 18, 28, 0.94), rgba(6, 8, 14, 0.98))`;
    return {
      "--hero-accent": vis.accent,
      "--hero-accent-soft": vis.accentSoft,
      background: `
      radial-gradient(ellipse at 30% 18%, color-mix(in srgb, ${vis.accent} 22%, transparent), transparent 52%),
      radial-gradient(ellipse at 82% 90%, color-mix(in srgb, ${vis.accentSoft} 14%, transparent), transparent 48%),
      ${base}
    `,
    } as Record<string, string>;
  });

  const personalityLabel = computed(() => {
    if (personality.value === "shy") return t("pet.personalityShy");
    if (personality.value === "cool") return t("pet.personalityCool");
    if (personality.value === "fiery") return t("pet.personalityFiery");
    return t("pet.personalitySunny");
  });

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

  function currentSettings(): PetSettings {
    const base: PetSettings = {
      ...settingsBag.value,
      enabled: enabled.value,
      muted: muted.value,
      ttsEnabled: ttsEnabled.value,
      ttsVoiceUri: ttsVoiceUri.value,
      chatEnabled: chatEnabled.value,
      chatAi: savedChatAi(),
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
      hitBoundsEnabled: hitBoundsEnabled.value,
      catchphrases: catchphrases.value.map((t) => t.trim()).filter(Boolean),
      catchphraseChance: clampCatchphraseChance(catchphraseChance.value),
      uiTheme: uiTheme.value,
      settingsAlwaysOnTop: settingsAlwaysOnTop.value,
      sysStatsDefaultExpanded: sysStatsDefaultExpanded.value,
      customVrmMotions: customVrmMotions.value.map((m) => ({ ...m })),
      vrmModelName: vrmModelName.value,
      vrmModelRev: vrmModelRev.value,
    };
    return patchActiveProfile(base, {
      customLines: customLines.value.map((l) => ({ ...l })),
      customLinesOnly: customLinesOnly.value,
      disabledMotions: [...disabledMotions.value],
      disabledBuiltInLines: [...disabledBuiltInLines.value],
    });
  }

  persistAndSyncImpl = async () => {
    const next = await publishPetSettings(currentSettings());
    settingsBag.value = next;
    await syncPetWindow();
  };

  persistOnlyImpl = async () => {
    const next = await publishPetSettings(currentSettings());
    settingsBag.value = next;
  };

  async function persistAndSync() {
    await persistAndSyncImpl();
  }

  async function persistOnly() {
    await persistOnlyImpl();
  }

  onMounted(() => {
    applyLocalFromSettings(loadPetSettings());
    void refreshVrmPreview();
    void syncPetWindow();
    void nextTick(() => {
      syncFormThumb(false);
      if (enabled.value) bindFormPickerRo();
    });

    void listen<PetSettings>(PET_SETTINGS_EVENT, (event) => {
      if (!event.payload) return;
      const incoming = event.payload;
      if (incoming.modelKind !== modelKind.value) {
        applyLocalFromSettings(incoming);
        void refreshVrmPreview();
        return;
      }
      settingsAlwaysOnTop.value = Boolean(incoming.settingsAlwaysOnTop);
      sysStatsDefaultExpanded.value = Boolean(incoming.sysStatsDefaultExpanded);
      uiTheme.value = isAppUiTheme(incoming.uiTheme)
        ? incoming.uiTheme
        : uiTheme.value;
      settingsBag.value = incoming;
    }).then((fn) => {
      unlistenSettings = fn;
    });

    window.addEventListener("storage", onSettingsStorage);
  });

  let unlistenSettings: UnlistenFn | null = null;

  function onSettingsStorage(ev: StorageEvent) {
    if (!isSettingsStorageKey(ev.key) || !ev.newValue) return;
    try {
      const incoming = JSON.parse(ev.newValue) as PetSettings;
      if (incoming.modelKind !== modelKind.value) {
        applyLocalFromSettings(incoming);
        void refreshVrmPreview();
        return;
      }
      settingsAlwaysOnTop.value = Boolean(incoming.settingsAlwaysOnTop);
      sysStatsDefaultExpanded.value = Boolean(incoming.sysStatsDefaultExpanded);
      settingsBag.value = incoming;
    } catch {
      // ignore
    }
  }

  onBeforeUnmount(() => {
    unlistenSettings?.();
    unlistenSettings = null;
    window.removeEventListener("storage", onSettingsStorage);
  });

  async function onEnabled(value: boolean) {
    enabled.value = value;
    if (value && isVrmPending.value) {
      await persistOnly();
      await syncPetWindow();
      message.info(t("pet.vrmNeedUploadFirst"));
      return;
    }
    await persistAndSync();
  }

  async function onModel(value: string | number) {
    if (!isPetModelKind(value)) return;
    const fromModel = settingsBag.value.modelKind;
    if (fromModel === value) return;

    const snapshot: PetSettings = {
      ...currentSettings(),
      modelKind: fromModel,
    };
    const switched = switchPetModel(snapshot, value, fromModel);
    applyLocalFromSettings(switched);

    const allowed = getCharacter(value).demoMotions;
    const okBuiltIn =
      isPetIdleMotion(demoMotion.value) &&
      (allowed as readonly string[]).includes(demoMotion.value);
    const okCustom =
      characterHas(value, "vrm-bone-editor") &&
      isCustomVrmMotionId(demoMotion.value);
    if (!okBuiltIn && !okCustom) {
      demoMotion.value = allowed[0] ?? "happy-bounce";
    }
    const next = await publishPetSettings(currentSettings());
    settingsBag.value = next;
    await syncPetWindow();
    await refreshVrmPreview();
  }

  async function onLook(id: string) {
    lookId.value = id;
    await persistAndSync();
  }

  async function onResetProfile() {
    const next = resetActiveModelProfile(currentSettings());
    applyLocalFromSettings(next);
    await persistAndSync();
    message.success(t("pet.resetProfileOk"));
  }

  async function onHitBounds(value: boolean) {
    hitBoundsEnabled.value = value;
    await persistOnly();
  }

  async function onSaveNickname() {
    await persistAndSync();
    if (!enabled.value) {
      message.warning(t("pet.motionNeedEnable"));
      return;
    }
    try {
      await requestPetIntro();
      message.success(t("pet.nicknameSaved"));
    } catch {
      message.error(t("pet.nicknameSaveFailed"));
    }
  }

  async function onPersonality(value: string | number) {
    if (!isPetPersonality(value)) return;
    personality.value = value;
    await persistOnly();
  }

  async function onMuted(value: boolean) {
    muted.value = value;
    await persistOnly();
  }

  async function onChatEnabled(value: boolean) {
    chatEnabled.value = value;
    await persistOnly();
  }

  async function onOpacity(value: number) {
    opacityPercent.value = value;
    await persistOnly();
  }

  async function onZoom(value: number) {
    zoomPercent.value = value;
    await persistOnly();
  }

  async function resetOpacity() {
    opacityPercent.value = 100;
    await onOpacity(100);
  }

  async function resetZoom() {
    zoomPercent.value = 0;
    await onZoom(0);
  }

  async function onTone(value: string | number) {
    tone.value = value === "snarky" ? "snarky" : "cute";
    await persistOnly();
  }

  async function onUsbWatch(value: boolean) {
    usbWatchEnabled.value = value;
    await persistOnly();
  }

  async function onRandomIdle(value: boolean) {
    randomIdleEnabled.value = value;
    await persistOnly();
  }

  async function onDemoMotion(value: unknown) {
    if (typeof value !== "string") return;
    if (!isPetIdleMotion(value) && !isCustomVrmMotionId(value)) return;
    demoMotion.value = value;
    await persistOnly();
  }

  async function onPlayMotion() {
    if (!enabled.value) {
      message.warning(t("pet.motionNeedEnable"));
      return;
    }
    try {
      await requestPetMotion(demoMotion.value);
    } catch {
      message.error(t("pet.motionPlayFailed"));
    }
  }

  async function onUiTheme(value: unknown) {
    if (!isAppUiTheme(value)) return;
    uiTheme.value = value;
    opts.onUiThemeChange?.(value);
    await persistOnly();
  }

  async function onSettingsPin(checked: unknown) {
    settingsAlwaysOnTop.value = Boolean(checked);
    await persistOnly();
    await applySettingsWindowPin(settingsAlwaysOnTop.value);
  }

  async function onSysStatsDefaultExpanded(value: unknown) {
    sysStatsDefaultExpanded.value = Boolean(value);
    await persistOnly();
  }

  async function persistCustomMotions() {
    await persistOnly();
  }

  async function onAddCustomMotion() {
    const next = createEmptyCustomVrmMotion(
      t("pet.customMotionDefaultName", {
        n: customVrmMotions.value.length + 1,
      })
    );
    customVrmMotions.value = [...customVrmMotions.value, next];
    demoMotion.value = next.id;
    editingCustomId.value = next.id;
    await persistOnly();
  }

  function toggleEditCustom(id: string) {
    editingCustomId.value = editingCustomId.value === id ? null : id;
  }

  function onCustomMotionBoneChange(next: CustomVrmMotion) {
    customVrmMotions.value = customVrmMotions.value.map((m) =>
      m.id === next.id ? next : m
    );
    void persistCustomMotions();
  }

  async function onRemoveCustomMotion(id: string) {
    customVrmMotions.value = customVrmMotions.value.filter((m) => m.id !== id);
    if (editingCustomId.value === id) editingCustomId.value = null;
    if (demoMotion.value === id) {
      demoMotion.value = getCharacter("vrm").demoMotions[0] ?? "happy-bounce";
    }
    await persistOnly();
  }

  async function onPlayCustomMotion(id: string) {
    if (!enabled.value) {
      message.warning(t("pet.motionNeedEnable"));
      return;
    }
    try {
      await requestPetMotion(id);
    } catch {
      message.error(t("pet.motionPlayFailed"));
    }
  }

  const pageCtx: PetSettingsPageCtx = {
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
    looks,
    formOptions,
    formPickerRef,
    formThumbStyle,
    toneOptions,
    ttsVoiceOptions,
    personalityOptions,
    uiThemeOptions,
    motionOptions,
    motionPoolIds,
    skinDefaultNickname,
    capabilities: computed(() => characterCapabilities(modelKind.value)),
    lookLabel,
    onEnabled,
    onModel,
    onLook,
    onSaveNickname,
    onPersonality,
    onResetProfile,
    onMuted,
    onTtsEnabled,
    onTtsVoice,
    onChatEnabled,
    onChatAiProvider,
    onChatAiModel,
    onChatAiAddModel,
    onChatAiRemoveModel,
    onChatAiSave,
    onChatAiReset,
    chatAiDirty,
    canAddChatAiModel,
    onOpacity,
    onZoom,
    resetOpacity,
    resetZoom,
    onTone,
    onUsbWatch,
    onRandomIdle,
    onHitBounds,
    onPickVrm,
    onClearVrm,
    onDemoMotion,
    onPlayMotion,
    onUiTheme,
    onSettingsPin,
    onSysStatsDefaultExpanded,
    persistOnly,
    persistCustomMotions,
    onAddCustomMotion,
    toggleEditCustom,
    onCustomMotionBoneChange,
    onRemoveCustomMotion,
    onPlayCustomMotion,
  };

  provide(PET_SETTINGS_PAGE_KEY, pageCtx);

  return {
    enabled,
    tone,
    previewAutoOrbit,
    canPreviewOrbit,
    effectivePreviewAutoOrbit,
    settingsTab,
    settingsTabs,
    activeModule,
    activeTabTitle,
    onSettingsTab,
    activeLook,
    v,
    vrmModelRev,
    vrmSrc,
    customVrmMotions,
    previewMotionOverride,
    previewAutoIdleClips,
    previewHint,
    displayName,
    heroPanelStyle,
    personalityLabel,
  };
}
