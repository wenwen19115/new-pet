import { computed, type Ref } from "vue";
import { useI18n } from "vue-i18n";
import { PET_CHAT_PROVIDERS, type PetChatAiConfig } from "@/pet/chat/providers";
import {
  listPetLooksForModel,
  resolveAppearance,
  resolveNickname,
} from "@/pet/skins";
import type { PetModelKind } from "@/pet/skins/types";
import type { PetPersonality } from "@/pet/content/dialogue/personality";
import type { CustomVrmMotion } from "@/pet/content/motion/customVrmMotions";
import type { AppUiTheme } from "@/theme/uiTheme";
import { listCharacters, characterCapabilities, getCharacter, characterHas, characterSupportsVrmAssets } from "@/pet/characters";
import { demoMotionOptions } from "@/pet/content/motion/motionPlayer";
import { listSettingsModules } from "../registry";
import type { SettingsModule } from "../registry";

type SavedChatAi = () => PetChatAiConfig;

export function usePetSettingsViewModel(deps: {
  enabled: Ref<boolean>;
  modelKind: Ref<PetModelKind>;
  lookId: Ref<string>;
  nickname: Ref<string>;
  personality: Ref<PetPersonality>;
  uiTheme: Ref<AppUiTheme>;
  settingsTab: Ref<string>;
  editingCustomId: Ref<string | null>;
  customVrmMotions: Ref<CustomVrmMotion[]>;
  vrmModelName: Ref<string>;
  vrmSrc: Ref<string | null>;
  savedChatAi: SavedChatAi;
}) {
  const { t } = useI18n();

  const uiThemeOptions = computed(() => [
    { label: t("pet.uiThemeNight"), value: "night" },
    { label: t("pet.uiThemeDay"), value: "day" },
  ]);

  const moduleCtx = computed(() => ({
    enabled: deps.enabled.value,
    modelKind: deps.modelKind.value,
    capabilities: characterCapabilities(deps.modelKind.value),
    vrmUploaded: Boolean(deps.vrmModelName.value.trim()),
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
    settingsModules.value.find((m) => m.id === deps.settingsTab.value) ??
    settingsModules.value[0]
  );

  const activeTabTitle = computed(() => {
    const mod = activeModule.value;
    if (!mod) return "";
    const base = t(mod.labelKey);
    if (mod.id !== "chat") return base;
    const saved = deps.savedChatAi();
    const provider =
      PET_CHAT_PROVIDERS[saved.provider] ?? PET_CHAT_PROVIDERS.local;
    return `${base} · ${t(provider.labelKey)}`;
  });

  const previewMotionOverride = computed(() =>
    deps.editingCustomId.value &&
    characterHas(deps.modelKind.value, "vrm-bone-editor")
      ? deps.editingCustomId.value
      : null
  );

  const previewAutoIdleClips = computed(
    () =>
      deps.settingsTab.value !== "motion" &&
      !deps.editingCustomId.value &&
      !previewMotionOverride.value
  );

  const looks = computed(() => listPetLooksForModel(deps.modelKind.value));

  function lookLabel(theme: { nameKey: string; toonNameKey?: string }) {
    const policy = getCharacter(deps.modelKind.value).appearance;
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
    demoMotionOptions(
      getCharacter(deps.modelKind.value).demoMotions,
      deps.customVrmMotions.value,
      characterSupportsVrmAssets(deps.modelKind.value)
    ).map((o) => ({
      value: o.value,
      label: o.label ?? (o.labelKey ? t(o.labelKey) : o.value),
    }))
  );

  const motionPoolIds = computed(
    () => [...getCharacter(deps.modelKind.value).demoMotions] as string[]
  );

  const activeLook = computed(() =>
    resolveAppearance(deps.modelKind.value, deps.lookId.value)
  );

  const previewHint = computed(() => {
    const character = getCharacter(activeLook.value.model);
    if (
      characterHas(activeLook.value.model, "vrm-upload") &&
      (!deps.vrmModelName.value.trim() || !deps.vrmSrc.value)
    ) {
      return t("pet.previewVrmUploadHint");
    }
    return t(character.previewHintKey);
  });

  const skinDefaultNickname = computed(() => activeLook.value.defaultNickname);
  const displayName = computed(() =>
    resolveNickname(deps.nickname.value, activeLook.value)
  );
  const v = computed(() => activeLook.value.visual);

  const heroPanelStyle = computed(() => {
    const vis = v.value;
    const day = deps.uiTheme.value === "day";
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
    if (deps.personality.value === "shy") return t("pet.personalityShy");
    if (deps.personality.value === "cool") return t("pet.personalityCool");
    if (deps.personality.value === "fiery") return t("pet.personalityFiery");
    return t("pet.personalitySunny");
  });

  return {
    uiThemeOptions,
    moduleCtx,
    settingsModules,
    settingsTabs,
    activeModule,
    activeTabTitle,
    previewMotionOverride,
    previewAutoIdleClips,
    looks,
    lookLabel,
    toneOptions,
    personalityOptions,
    formOptions,
    motionOptions,
    motionPoolIds,
    activeLook,
    previewHint,
    skinDefaultNickname,
    displayName,
    v,
    heroPanelStyle,
    personalityLabel,
  };
}
