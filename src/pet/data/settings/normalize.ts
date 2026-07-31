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
import { isAppUiTheme } from "@/theme/uiTheme";
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

function clampOpacity(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_PET_SETTINGS.opacity;
  return Math.min(1, Math.max(0.3, value));
}

function normalizeTone(value: unknown): PetTone {
  return value === "snarky" ? "snarky" : "cute";
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
  if (isPetIdleMotion(value)) {
    const allowed = getCharacter(model).demoMotions;
    if ((allowed as readonly string[]).includes(value)) return value;
  }
  return defaultProfileForModel(model).demoMotion;
}

function normalizePersonality(value: unknown): PetPersonality {
  return isPetPersonality(value)
    ? value
    : DEFAULT_PET_SETTINGS.personality;
}

type ProfileFallbacks = Pick<
  PetModelProfile,
  | "muted"
  | "ttsEnabled"
  | "ttsVoiceUri"
  | "chatAi"
  | "opacity"
  | "usbWatchEnabled"
  | "randomIdleEnabled"
  | "hitBoundsEnabled"
  | "playfulModeEnabled"
>;

export function normalizeOneProfile(
  model: PetModelKind,
  raw: Partial<PetModelProfile> | null | undefined,
  fallbacks?: Partial<ProfileFallbacks>,
  legacyVrm?: { motions?: unknown; name?: string; rev?: number }
): PetModelProfile {
  const base = defaultProfileForModel(model);
  const lookRaw =
    typeof raw?.lookId === "string" && isPetLookId(raw.lookId)
      ? raw.lookId
      : base.lookId;

  let extensions = normalizeExtensions(raw?.extensions);
  if (characterSupportsVrmAssets(model)) {
    const fromProfile = extensions.vrm;
    const legacyMotions = Array.isArray(legacyVrm?.motions)
      ? (legacyVrm!.motions as import("../../content/motion/customVrmMotions").CustomVrmMotion[])
      : undefined;
    const merged = normalizeVrmExtension({
      customMotions:
        fromProfile?.customMotions?.length
          ? fromProfile.customMotions
          : legacyMotions,
      modelName: fromProfile?.modelName || legacyVrm?.name || "",
      modelRev: fromProfile?.modelRev || legacyVrm?.rev || 0,
    });
    extensions = { ...extensions, vrm: merged };
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
    muted:
      raw?.muted === undefined
        ? Boolean(fallbacks?.muted ?? base.muted)
        : Boolean(raw.muted),
    ttsEnabled:
      raw?.ttsEnabled === undefined
        ? Boolean(fallbacks?.ttsEnabled ?? base.ttsEnabled)
        : Boolean(raw.ttsEnabled),
    ttsVoiceUri:
      typeof raw?.ttsVoiceUri === "string"
        ? raw.ttsVoiceUri
        : (fallbacks?.ttsVoiceUri ?? base.ttsVoiceUri),
    chatAi: normalizePetChatAi(
      raw?.chatAi !== undefined ? raw.chatAi : fallbacks?.chatAi ?? base.chatAi
    ),
    opacity: clampOpacity(
      Number(
        raw?.opacity === undefined
          ? (fallbacks?.opacity ?? base.opacity)
          : raw.opacity
      )
    ),
    usbWatchEnabled:
      raw?.usbWatchEnabled === undefined
        ? Boolean(fallbacks?.usbWatchEnabled ?? base.usbWatchEnabled)
        : Boolean(raw.usbWatchEnabled),
    randomIdleEnabled:
      raw?.randomIdleEnabled === undefined
        ? Boolean(fallbacks?.randomIdleEnabled ?? base.randomIdleEnabled)
        : Boolean(raw.randomIdleEnabled),
    playfulModeEnabled:
      raw?.playfulModeEnabled === undefined
        ? Boolean(fallbacks?.playfulModeEnabled ?? base.playfulModeEnabled)
        : Boolean(raw.playfulModeEnabled),
    hitBoundsEnabled:
      raw?.hitBoundsEnabled === undefined
        ? Boolean(fallbacks?.hitBoundsEnabled ?? base.hitBoundsEnabled)
        : Boolean(raw.hitBoundsEnabled),
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
      raw?.disabledMotions ?? base.disabledMotions
    ),
    disabledBuiltInLines: normalizeDisabledMotions(
      raw?.disabledBuiltInLines ?? base.disabledBuiltInLines
    ),
    extensions,
  };
}

function legacySharedFallbacks(
  raw: Partial<PetSettings> | null | undefined
): ProfileFallbacks {
  return {
    muted:
      raw?.muted === undefined
        ? DEFAULT_PET_SETTINGS.muted
        : Boolean(raw.muted),
    ttsEnabled:
      raw?.ttsEnabled === undefined
        ? DEFAULT_PET_SETTINGS.ttsEnabled
        : Boolean(raw.ttsEnabled),
    ttsVoiceUri:
      typeof raw?.ttsVoiceUri === "string"
        ? raw.ttsVoiceUri
        : DEFAULT_PET_SETTINGS.ttsVoiceUri,
    chatAi: normalizePetChatAi(raw?.chatAi),
    opacity: clampOpacity(
      Number(raw?.opacity ?? DEFAULT_PET_SETTINGS.opacity)
    ),
    usbWatchEnabled:
      raw?.usbWatchEnabled === undefined
        ? DEFAULT_PET_SETTINGS.usbWatchEnabled
        : Boolean(raw.usbWatchEnabled),
    randomIdleEnabled:
      raw?.randomIdleEnabled === undefined
        ? DEFAULT_PET_SETTINGS.randomIdleEnabled
        : Boolean(raw.randomIdleEnabled),
    playfulModeEnabled:
      raw?.playfulModeEnabled === undefined
        ? DEFAULT_PET_SETTINGS.playfulModeEnabled
        : Boolean(raw.playfulModeEnabled),
    hitBoundsEnabled:
      raw?.hitBoundsEnabled === undefined
        ? DEFAULT_PET_SETTINGS.hitBoundsEnabled
        : Boolean(raw.hitBoundsEnabled),
  };
}

function normalizeProfiles(
  raw: Partial<PetSettings> | null | undefined,
  modelKind: PetModelKind
): PetModelProfiles {
  const defaults = createDefaultProfiles();
  const incoming = (raw?.profiles ?? {}) as Partial<
    Record<PetModelKind, Partial<PetModelProfile>>
  >;
  const hasProfiles =
    raw?.profiles &&
    typeof raw.profiles === "object" &&
    Object.keys(raw.profiles as object).length > 0;

  const legacyVrm = {
    motions: raw?.customVrmMotions,
    name: raw?.vrmModelName,
    rev: raw?.vrmModelRev,
  };

  const next = { ...defaults };
  for (const kind of PET_MODEL_KINDS) {
    const profileRaw = incoming[kind];
    const chatAiFallback =
      profileRaw &&
      profileRaw.chatAi === undefined &&
      raw?.chatAi !== undefined
        ? { chatAi: normalizePetChatAi(raw.chatAi) }
        : undefined;
    next[kind] = normalizeOneProfile(
      kind,
      profileRaw,
      chatAiFallback,
      characterSupportsVrmAssets(kind) ? legacyVrm : undefined
    );
  }

  if (!hasProfiles) {
    const shared = legacySharedFallbacks(raw);
    next[modelKind] = normalizeOneProfile(
      modelKind,
      {
        nickname: typeof raw?.nickname === "string" ? raw.nickname : "",
        personality: isPetPersonality(raw?.personality)
          ? raw.personality
          : undefined,
        tone:
          raw?.tone === "snarky" || raw?.tone === "cute" ? raw.tone : undefined,
        lookId: typeof raw?.lookId === "string" ? raw.lookId : undefined,
        zoomPercent:
          raw?.zoomPercent === undefined ? undefined : Number(raw.zoomPercent),
        demoMotion:
          typeof raw?.demoMotion === "string" ? raw.demoMotion : undefined,
        muted: raw?.muted,
        ttsEnabled: raw?.ttsEnabled,
        ttsVoiceUri:
          typeof raw?.ttsVoiceUri === "string" ? raw.ttsVoiceUri : undefined,
        opacity: raw?.opacity,
        usbWatchEnabled: raw?.usbWatchEnabled,
        randomIdleEnabled: raw?.randomIdleEnabled,
      },
      shared,
      characterSupportsVrmAssets(modelKind) ? legacyVrm : undefined
    );
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
  | "hitBoundsEnabled"
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
    hitBoundsEnabled: p.hitBoundsEnabled,
    catchphrases: p.catchphrases,
    catchphraseChance: p.catchphraseChance,
    vrmModelName: vrm.modelName,
    vrmModelRev: vrm.modelRev,
    customVrmMotions: vrm.customMotions,
  };
}

function resolveGlobalChatEnabled(
  raw: Partial<PetSettings> | null | undefined,
  modelKind: PetModelKind
): boolean {
  if (raw?.chatEnabled !== undefined) return Boolean(raw.chatEnabled);
  const profile = (
    raw?.profiles as Partial<Record<PetModelKind, Record<string, unknown>>> | undefined
  )?.[modelKind];
  if (profile && typeof profile.chatEnabled === "boolean") {
    return profile.chatEnabled;
  }
  return DEFAULT_PET_SETTINGS.chatEnabled;
}

export function normalizePetSettings(
  raw: Partial<PetSettings> | null | undefined
): PetSettings {
  const modelKind = isPetModelKind(raw?.modelKind)
    ? raw.modelKind
    : DEFAULT_PET_MODEL;
  const profiles = normalizeProfiles(raw, modelKind);
  const active = applyActiveProfile(modelKind, profiles);

  return {
    enabled: Boolean(raw?.enabled),
    modelKind,
    uiTheme: isAppUiTheme(raw?.uiTheme)
      ? raw.uiTheme
      : DEFAULT_PET_SETTINGS.uiTheme,
    settingsAlwaysOnTop: Boolean(
      raw?.settingsAlwaysOnTop ?? DEFAULT_PET_SETTINGS.settingsAlwaysOnTop
    ),
    sysStatsDefaultExpanded: Boolean(
      raw?.sysStatsDefaultExpanded ??
        DEFAULT_PET_SETTINGS.sysStatsDefaultExpanded
    ),
    chatEnabled: resolveGlobalChatEnabled(raw, modelKind),
    deskWeather: normalizeDeskWeather(raw?.deskWeather),
    profiles,
    ...active,
  };
}
