import type {
  PetModelProfile,
  PetModelProfiles,
  PetSettings,
  PetTone,
} from "../types";
import {
  createDefaultProfiles,
  DEFAULT_PET_SETTINGS,
  defaultProfileForModel,
} from "./defaults";
import { normalizePetChatAi } from "../../chat/providers";
import { isPetIdleMotion } from "../../content/motion/motions";
import {
  isPetModelKind,
  isPetLookId,
  coerceLookIdForModel,
  DEFAULT_PET_MODEL,
  type PetModelKind,
} from "../../skins";
import {
  isPetPersonality,
  type PetPersonality,
} from "../../content/dialogue/personality";
import { clampPetZoom } from "../../bridge/sizes";
import { resolveThemePackId } from "@/theme/registry";
import {
  DEFAULT_THEME_BOOT_ANIMATION,
  DEFAULT_THEME_STAGE_BACKDROP,
  clampBootDurationSec,
  clampBubbleOpacity,
  isThemeBootDurationMode,
  isThemeStageBackdropMode,
  isThemeWallpaperFit,
  type PetThemeSettings,
} from "@/theme/types";
import { isCustomVrmMotionId } from "../../content/motion/customVrmMotions";
import {
  characterSupportsVrmAssets,
  getCharacter,
  PET_MODEL_KINDS,
} from "../../characters";
import {
  normalizeCustomLines,
  normalizeDisabledMotions,
} from "../../content/dialogue/customLines";
import {
  clampCatchphraseChance,
  normalizeCatchphrases,
} from "../../content/dialogue/catchphrases";
import {
  emptyVrmExtension,
  normalizeExtensions,
  normalizeVrmExtension,
} from "../extensions";
import { normalizeDeskWeather } from "../deskWeather";
import { normalizeSkyWeather } from "../skyWeather";

function clampOpacity(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_PET_SETTINGS.opacity;
  return Math.min(1, Math.max(0.3, value));
}

function normalizeTone(value: unknown): PetTone {
  return value === "snarky" ? "snarky" : "cute";
}

function migrateLegacyMotionId(value: string): string {
  // 曾误标 VRMA_04 Shoot 为 stretch
  if (value === "vrm-stretch") return "vrm-shoot";
  return value;
}

function normalizeDemoMotion(
  value: unknown,
  model: PetModelKind,
  customVrmIds?: Set<string>
): string {
  if (
    typeof value === "string" &&
    characterSupportsVrmAssets(model) &&
    isCustomVrmMotionId(value)
  ) {
    if (!customVrmIds || customVrmIds.has(value)) return value;
  }
  if (typeof value === "string") {
    const migrated = migrateLegacyMotionId(value);
    if (isPetIdleMotion(migrated)) {
      const allowed = getCharacter(model).demoMotions;
      if ((allowed as readonly string[]).includes(migrated)) return migrated;
    }
  }
  return defaultProfileForModel(model).demoMotion;
}

function normalizePersonality(value: unknown): PetPersonality {
  return isPetPersonality(value)
    ? value
    : DEFAULT_PET_SETTINGS.personality;
}

export function normalizeOneProfile(
  model: PetModelKind,
  raw: Partial<PetModelProfile> | null | undefined
): PetModelProfile {
  const base = defaultProfileForModel(model);
  const lookRaw =
    typeof raw?.lookId === "string" && isPetLookId(raw.lookId)
      ? raw.lookId
      : base.lookId;

  let extensions = normalizeExtensions(raw?.extensions);
  if (characterSupportsVrmAssets(model)) {
    extensions = {
      ...extensions,
      vrm: normalizeVrmExtension(extensions.vrm),
    };
  }

  const customVrmIds = new Set(
    (extensions.vrm?.customMotions ?? []).map((m) => m.id)
  );

  return {
    nickname: typeof raw?.nickname === "string" ? raw.nickname.trim() : "",
    personality: normalizePersonality(raw?.personality ?? base.personality),
    tone: normalizeTone(raw?.tone ?? base.tone),
    lookId: coerceLookIdForModel(lookRaw, model),
    zoomPercent: clampPetZoom(
      Number(raw?.zoomPercent ?? base.zoomPercent)
    ),
    demoMotion: normalizeDemoMotion(
      raw?.demoMotion ?? base.demoMotion,
      model,
      customVrmIds
    ),
    muted: raw?.muted === undefined ? base.muted : Boolean(raw.muted),
    ttsEnabled:
      raw?.ttsEnabled === undefined ? base.ttsEnabled : Boolean(raw.ttsEnabled),
    ttsVoiceUri:
      typeof raw?.ttsVoiceUri === "string"
        ? raw.ttsVoiceUri
        : base.ttsVoiceUri,
    chatAi: normalizePetChatAi(raw?.chatAi ?? base.chatAi),
    opacity: clampOpacity(Number(raw?.opacity ?? base.opacity)),
    usbWatchEnabled:
      raw?.usbWatchEnabled === undefined
        ? base.usbWatchEnabled
        : Boolean(raw.usbWatchEnabled),
    randomIdleEnabled:
      raw?.randomIdleEnabled === undefined
        ? base.randomIdleEnabled
        : Boolean(raw.randomIdleEnabled),
    playfulModeEnabled:
      raw?.playfulModeEnabled === undefined
        ? base.playfulModeEnabled
        : Boolean(raw.playfulModeEnabled),
    catchphrases: normalizeCatchphrases(
      raw?.catchphrases ?? base.catchphrases,
      model
    ),
    catchphraseChance: clampCatchphraseChance(
      raw?.catchphraseChance ?? base.catchphraseChance
    ),
    customLines: normalizeCustomLines(raw?.customLines ?? base.customLines),
    customLinesOnly: Boolean(raw?.customLinesOnly ?? base.customLinesOnly),
    disabledMotions: normalizeDisabledMotions(
      (raw?.disabledMotions ?? base.disabledMotions).map((id) =>
        typeof id === "string" ? migrateLegacyMotionId(id) : id
      )
    ),
    disabledBuiltInLines: normalizeDisabledMotions(
      raw?.disabledBuiltInLines ?? base.disabledBuiltInLines
    ),
    extensions,
  };
}

function normalizeProfiles(
  raw: Partial<PetSettings> | null | undefined
): PetModelProfiles {
  const defaults = createDefaultProfiles();
  const incoming = (raw?.profiles ?? {}) as Partial<
    Record<PetModelKind, Partial<PetModelProfile>>
  >;

  const next = { ...defaults };
  for (const kind of PET_MODEL_KINDS) {
    next[kind] = normalizeOneProfile(kind, incoming[kind]);
  }
  return next;
}

export function applyActiveProfile(
  modelKind: PetModelKind,
  profiles: PetModelProfiles
): Pick<
  PetSettings,
  | "tone"
  | "demoMotion"
  | "lookId"
  | "nickname"
  | "personality"
  | "zoomPercent"
  | "muted"
  | "ttsEnabled"
  | "ttsVoiceUri"
  | "chatAi"
  | "opacity"
  | "usbWatchEnabled"
  | "randomIdleEnabled"
  | "playfulModeEnabled"
  | "catchphrases"
  | "catchphraseChance"
  | "vrmModelName"
  | "vrmModelRev"
  | "customVrmMotions"
> {
  const p = profiles[modelKind] ?? defaultProfileForModel(modelKind);
  const vrm = profiles.vrm?.extensions.vrm ?? emptyVrmExtension();
  return {
    tone: p.tone,
    demoMotion: p.demoMotion,
    lookId: p.lookId,
    nickname: p.nickname,
    personality: p.personality,
    zoomPercent: p.zoomPercent,
    muted: p.muted,
    ttsEnabled: p.ttsEnabled,
    ttsVoiceUri: p.ttsVoiceUri,
    chatAi: p.chatAi,
    opacity: p.opacity,
    usbWatchEnabled: p.usbWatchEnabled,
    randomIdleEnabled: p.randomIdleEnabled,
    playfulModeEnabled: p.playfulModeEnabled,
    catchphrases: p.catchphrases,
    catchphraseChance: p.catchphraseChance,
    vrmModelName: vrm.modelName,
    vrmModelRev: vrm.modelRev,
    customVrmMotions: vrm.customMotions,
  };
}

function normalizeTheme(raw: unknown): PetThemeSettings {
  const base = DEFAULT_PET_SETTINGS.theme;
  const obj =
    raw && typeof raw === "object" ? (raw as Partial<PetThemeSettings>) : {};
  const stageRaw =
    obj.stageBackdrop && typeof obj.stageBackdrop === "object"
      ? obj.stageBackdrop
      : {};
  const bootRaw =
    obj.bootAnimation && typeof obj.bootAnimation === "object"
      ? obj.bootAnimation
      : {};
  const dim = Number(
    (stageRaw as { dim?: unknown }).dim ?? DEFAULT_THEME_STAGE_BACKDROP.dim
  );
  return {
    style: resolveThemePackId(obj.style ?? base.style),
    stageBackdrop: {
      mode: isThemeStageBackdropMode(
        (stageRaw as { mode?: unknown }).mode
      )
        ? (stageRaw as { mode: PetThemeSettings["stageBackdrop"]["mode"] }).mode
        : base.stageBackdrop.mode,
      imagePath:
        typeof (stageRaw as { imagePath?: unknown }).imagePath === "string"
          ? (stageRaw as { imagePath: string }).imagePath
          : base.stageBackdrop.imagePath,
      dim: Number.isFinite(dim) ? Math.min(1, Math.max(0, dim)) : base.stageBackdrop.dim,
      fit: isThemeWallpaperFit((stageRaw as { fit?: unknown }).fit)
        ? (stageRaw as { fit: PetThemeSettings["stageBackdrop"]["fit"] }).fit
        : base.stageBackdrop.fit,
      muted:
        typeof (stageRaw as { muted?: unknown }).muted === "boolean"
          ? (stageRaw as { muted: boolean }).muted
          : base.stageBackdrop.muted,
    },
    bootAnimation: {
      enabled:
        typeof (bootRaw as { enabled?: unknown }).enabled === "boolean"
          ? (bootRaw as { enabled: boolean }).enabled
          : base.bootAnimation.enabled,
      mediaPath:
        typeof (bootRaw as { mediaPath?: unknown }).mediaPath === "string"
          ? (bootRaw as { mediaPath: string }).mediaPath
          : base.bootAnimation.mediaPath,
      muted:
        typeof (bootRaw as { muted?: unknown }).muted === "boolean"
          ? (bootRaw as { muted: boolean }).muted
          : DEFAULT_THEME_BOOT_ANIMATION.muted,
      fit: isThemeWallpaperFit((bootRaw as { fit?: unknown }).fit)
        ? (bootRaw as { fit: PetThemeSettings["bootAnimation"]["fit"] }).fit
        : base.bootAnimation.fit,
      durationMode: isThemeBootDurationMode(
        (bootRaw as { durationMode?: unknown }).durationMode
      )
        ? (bootRaw as { durationMode: PetThemeSettings["bootAnimation"]["durationMode"] })
            .durationMode
        : base.bootAnimation.durationMode,
      durationSec: clampBootDurationSec(
        (bootRaw as { durationSec?: unknown }).durationSec ??
          base.bootAnimation.durationSec
      ),
    },
    bubbleOpacity: clampBubbleOpacity(
      (obj as { bubbleOpacity?: unknown }).bubbleOpacity ?? base.bubbleOpacity
    ),
  };
}

export function normalizePetSettings(
  raw: Partial<PetSettings> | null | undefined
): PetSettings {
  const modelKind = isPetModelKind(raw?.modelKind)
    ? raw.modelKind
    : DEFAULT_PET_MODEL;
  const profiles = normalizeProfiles(raw);
  const active = applyActiveProfile(modelKind, profiles);

  return {
    enabled: Boolean(raw?.enabled),
    modelKind,
    theme: normalizeTheme(raw?.theme),
    settingsAlwaysOnTop: Boolean(
      raw?.settingsAlwaysOnTop ?? DEFAULT_PET_SETTINGS.settingsAlwaysOnTop
    ),
    sysStatsDefaultExpanded: Boolean(
      raw?.sysStatsDefaultExpanded ??
        DEFAULT_PET_SETTINGS.sysStatsDefaultExpanded
    ),
    chatEnabled:
      raw?.chatEnabled === undefined
        ? DEFAULT_PET_SETTINGS.chatEnabled
        : Boolean(raw.chatEnabled),
    deskWeather: normalizeDeskWeather(raw?.deskWeather),
    skyWeather: normalizeSkyWeather(raw?.skyWeather),
    profiles,
    ...active,
  };
}
