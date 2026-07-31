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
    hitBoundsEnabled:
      raw?.hitBoundsEnabled === undefined
        ? base.hitBoundsEnabled
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
    chatEnabled:
      raw?.chatEnabled === undefined
        ? DEFAULT_PET_SETTINGS.chatEnabled
        : Boolean(raw.chatEnabled),
    deskWeather: normalizeDeskWeather(raw?.deskWeather),
    profiles,
    ...active,
  };
}
