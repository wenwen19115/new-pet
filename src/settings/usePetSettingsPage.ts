import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from "vue";
import { message } from "ant-design-vue";
import { open } from "@tauri-apps/plugin-dialog";
import { useI18n } from "vue-i18n";
import { isPetIdleMotion } from "@/pet/motions";
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
} from "@/pet/settings";
import { syncPetWindow } from "@/pet/petWindow";
import {
  coerceLookIdForModel,
  isPetModelKind,
  listPetLooksForModel,
  resolveAppearance,
  resolveNickname,
  type PetModelKind,
} from "@/pet/skins";
import {
  isPetPersonality,
  type PetPersonality,
} from "@/pet/personality";
import type { PetSettings, PetTone } from "@/pet/types";
import {
  createEmptyCustomVrmMotion,
  isCustomVrmMotionId,
  type CustomVrmMotion,
} from "@/pet/customVrmMotions";
import type { PetCustomLine } from "@/pet/customLines";
import { listPetTtsVoices } from "@/pet/tts";
import { isAppUiTheme, type AppUiTheme } from "@/theme/uiTheme";
import {
  clearPetVrmFile,
  importPetVrmFromPath,
  PetVrmImportException,
  resolvePetVrmSrc,
} from "@/pet/vrmStorage";
import { listCharacters, characterCapabilities, getCharacter, characterHas } from "@/pet/characters";
import { demoMotionOptions } from "@/pet/domain/motionPlayer";
import {
  registerBuiltinSettingsModules,
} from "./registerBuiltin";
import { listSettingsModules } from "./registry";
import type { SettingsModule } from "./registry";
import {
  PET_SETTINGS_PAGE_KEY,
  type PetSettingsPageCtx,
} from "./context";

export type UsePetSettingsPageOptions = {
  onUiThemeChange?: (theme: AppUiTheme) => void;
};

export function usePetSettingsPage(opts: UsePetSettingsPageOptions = {}) {
  registerBuiltinSettingsModules();
  const { t } = useI18n();

const enabled = ref(false);
const muted = ref(false);
const ttsEnabled = ref(false);
const ttsVoiceUri = ref("");
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
const uiTheme = ref<AppUiTheme>("night");
const settingsAlwaysOnTop = ref(false);
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
const vrmModelName = ref("");
const vrmModelRev = ref(0);
const vrmSrc = ref<string | null>(null);
const vrmBusy = ref(false);
const settingsBag = ref<PetSettings>(loadPetSettings());

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
  return mod ? t(mod.labelKey) : "";
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

const isVrmPending = computed(
  () =>
    moduleCtx.value.capabilities.has("vrm-upload") &&
    !vrmModelName.value.trim()
);

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

const ttsVoiceOptions = ref<Array<{ label: string; value: string }>>([
  { label: "", value: "" },
]);

async function refreshTtsVoiceOptions() {
  const voices = await listPetTtsVoices();
  ttsVoiceOptions.value = [
    { label: t("pet.ttsVoiceAuto"), value: "" },
    ...voices.map((v) => ({
      label: v.name,
      value: v.uri,
    })),
  ];
}

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

const formPickerRef = ref<HTMLElement | null>(null);
const formThumbStyle = ref<Record<string, string>>({
  opacity: "0",
  transform: "translateX(0)",
  width: "0px",
});

/** Transition lives in CSS; only disable briefly for instant initial layout. */
function setThumbTransitionEnabled(on: boolean) {
  const thumb = formPickerRef.value?.querySelector(
    ".form-picker-thumb"
  ) as HTMLElement | null;
  if (!thumb) return;
  thumb.style.transition = on ? "" : "none";
}

function syncFormThumb(animate: boolean) {
  const root = formPickerRef.value;
  if (!root) return;
  const active = root.querySelector(
    ".form-picker-item.is-active"
  ) as HTMLElement | null;
  if (!active) {
    setThumbTransitionEnabled(false);
    formThumbStyle.value = {
      opacity: "0",
      transform: "translateX(0)",
      width: "0px",
    };
    return;
  }

  if (!animate) {
    setThumbTransitionEnabled(false);
  }

  formThumbStyle.value = {
    opacity: "1",
    width: `${active.offsetWidth}px`,
    transform: `translateX(${active.offsetLeft}px)`,
  };

  if (!animate) {
    // Reflow, then restore CSS transition for subsequent slides.
    void root.offsetWidth;
    setThumbTransitionEnabled(true);
  }
}

watch(
  modelKind,
  async () => {
    await nextTick();
    syncFormThumb(true);
  }
);

let formPickerRo: ResizeObserver | null = null;

function bindFormPickerRo() {
  formPickerRo?.disconnect();
  formPickerRo = null;
  const root = formPickerRef.value;
  if (!root || typeof ResizeObserver === "undefined") return;
  // Keep CSS transition — never force transition:none here (that killed the slide).
  formPickerRo = new ResizeObserver(() => syncFormThumb(true));
  formPickerRo.observe(root);
}

watch(formPickerRef, async (el) => {
  if (!el) {
    formPickerRo?.disconnect();
    formPickerRo = null;
    return;
  }
  await nextTick();
  syncFormThumb(false);
  bindFormPickerRo();
});

watch(enabled, async (on) => {
  if (!on) {
    formPickerRo?.disconnect();
    formPickerRo = null;
    return;
  }
  if (settingsTab.value !== "buddy") return;
  await nextTick();
  syncFormThumb(false);
  bindFormPickerRo();
});

watch(settingsTab, async (tab) => {
  if (tab !== "buddy" || !enabled.value) return;
  await nextTick();
  syncFormThumb(false);
  bindFormPickerRo();
});

onBeforeUnmount(() => {
  formPickerRo?.disconnect();
  formPickerRo = null;
});

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
    !vrmModelName.value.trim()
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

function applyLocalFromSettings(s: PetSettings) {
  settingsBag.value = s;
  enabled.value = s.enabled;
  muted.value = s.muted;
  ttsEnabled.value = Boolean(s.ttsEnabled);
  ttsVoiceUri.value = typeof s.ttsVoiceUri === "string" ? s.ttsVoiceUri : "";
  opacityPercent.value = Math.round(s.opacity * 100);
  void refreshTtsVoiceOptions();
  zoomPercent.value = s.zoomPercent;
  tone.value = s.tone;
  demoMotion.value =
    isPetIdleMotion(s.demoMotion) || isCustomVrmMotionId(s.demoMotion)
      ? s.demoMotion
      : "fly-orbit";
  modelKind.value = s.modelKind;
  lookId.value = coerceLookIdForModel(s.lookId, s.modelKind);
  nickname.value = s.nickname;
  personality.value = s.personality;
  usbWatchEnabled.value = s.usbWatchEnabled;
  randomIdleEnabled.value = s.randomIdleEnabled;
  hitBoundsEnabled.value = s.hitBoundsEnabled;
  uiTheme.value = isAppUiTheme(s.uiTheme) ? s.uiTheme : "night";
  settingsAlwaysOnTop.value = Boolean(s.settingsAlwaysOnTop);
  customVrmMotions.value = s.customVrmMotions.map((m) => ({ ...m }));
  const profile = s.profiles[s.modelKind];
  customLines.value = (profile?.customLines ?? []).map((l) => ({ ...l }));
  customLinesOnly.value = Boolean(profile?.customLinesOnly);
  disabledMotions.value = [...(profile?.disabledMotions ?? [])];
  disabledBuiltInLines.value = [...(profile?.disabledBuiltInLines ?? [])];
  vrmModelName.value = s.vrmModelName;
  vrmModelRev.value = s.vrmModelRev;
  opts.onUiThemeChange?.(uiTheme.value);
}

function currentSettings(): PetSettings {
  const base: PetSettings = {
    ...settingsBag.value,
    enabled: enabled.value,
    muted: muted.value,
    ttsEnabled: ttsEnabled.value,
    ttsVoiceUri: ttsVoiceUri.value,
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
    uiTheme: uiTheme.value,
    settingsAlwaysOnTop: settingsAlwaysOnTop.value,
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

async function refreshVrmPreview() {
  if (!vrmModelName.value) {
    vrmSrc.value = null;
    return;
  }
  vrmSrc.value = await resolvePetVrmSrc(vrmModelRev.value);
}

async function persistAndSync() {
  const next = await publishPetSettings(currentSettings());
  settingsBag.value = next;
  await syncPetWindow();
}

async function persistOnly() {
  const next = await publishPetSettings(currentSettings());
  settingsBag.value = next;
}

onMounted(() => {
  applyLocalFromSettings(loadPetSettings());
  void refreshVrmPreview();
  void syncPetWindow();
  void nextTick(() => {
    syncFormThumb(false);
    if (enabled.value) bindFormPickerRo();
  });
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
  await persistAndSync();
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

async function onTtsEnabled(value: boolean) {
  ttsEnabled.value = value;
  if (value) void refreshTtsVoiceOptions();
  await persistOnly();
}

async function onTtsVoice(value: unknown) {
  ttsVoiceUri.value = typeof value === "string" ? value : "";
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

async function onPickVrm() {
  if (vrmBusy.value) return;
  const selected = await open({
    multiple: false,
    filters: [{ name: "VRM", extensions: ["vrm"] }],
  });
  if (selected == null) return;
  const path = Array.isArray(selected) ? selected[0] : selected;
  if (!path) return;

  vrmBusy.value = true;
  try {
    const imported = await importPetVrmFromPath(path);
    vrmSrc.value = imported.src;
    vrmModelName.value = imported.name;
    vrmModelRev.value = Date.now();
    await persistAndSync();
    message.success(t("pet.vrmUploadOk"));
  } catch (err) {
    console.warn("[pet] pick vrm failed", err);
    if (err instanceof PetVrmImportException) {
      if (err.code === "too_large") {
        message.error(t("pet.vrmTooLarge"));
      } else if (err.code === "not_vrm") {
        message.error(t("pet.vrmInvalid"));
      } else {
        message.error(
          err.message && err.message !== "failed"
            ? `${t("pet.vrmUploadFail")}: ${err.message}`
            : t("pet.vrmUploadFail")
        );
      }
    } else {
      const detail = err instanceof Error ? err.message : String(err);
      message.error(
        detail ? `${t("pet.vrmUploadFail")}: ${detail}` : t("pet.vrmUploadFail")
      );
    }
  } finally {
    vrmBusy.value = false;
  }
}

async function onClearVrm() {
  if (vrmBusy.value) return;
  vrmBusy.value = true;
  try {
    await clearPetVrmFile();
    vrmModelName.value = "";
    vrmModelRev.value = 0;
    vrmSrc.value = null;
    await persistAndSync();
    message.success(t("pet.vrmCleared"));
  } catch (err) {
    console.warn("[pet] clear vrm failed", err);
    message.error(t("pet.vrmUploadFail"));
  } finally {
    vrmBusy.value = false;
  }
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
  uiTheme,
  settingsAlwaysOnTop,
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
    // shell
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
    // hero
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
    // pageCtx already provided
    pageCtx,
  };
}
