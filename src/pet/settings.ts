import {
  createDefaultProfiles,
  DEFAULT_PET_SETTINGS,
  defaultProfileForModel,
  PET_MODEL_KINDS,
  PET_SETTINGS_EVENT,
  type PetModelProfile,
  type PetModelProfiles,
  type PetSettings,
  type PetTone,
} from "./types";
import { normalizePetChatAi } from "./chat/providers";
import { isPetIdleMotion } from "./motions";
import {
  isPetModelKind,
  isPetLookId,
  coerceLookIdForModel,
  DEFAULT_PET_MODEL,
  type PetModelKind,
} from "./skins";
import {
  isPetPersonality,
  type PetPersonality,
} from "./personality";
import { clampPetZoom } from "./sizes";
import { isAppUiTheme } from "@/theme/uiTheme";
import { isCustomVrmMotionId } from "./customVrmMotions";
import {
  normalizeCustomLines,
  normalizeDisabledMotions,
} from "./customLines";
import {
  clampCatchphraseChance,
  normalizeCatchphrases,
} from "./catchphrases";
import {
  emptyVrmExtension,
  normalizeExtensions,
  normalizeVrmExtension,
} from "./domain/extensions";
import { getCharacter } from "./characters";
import { readSettingsRaw, writeSettingsRaw } from "./storageKeys";

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
  if (typeof value === "string" && model === "vrm" && isCustomVrmMotionId(value)) {
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
>;

function normalizeOneProfile(
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
  if (model === "vrm") {
    const fromProfile = extensions.vrm;
    const legacyMotions = Array.isArray(legacyVrm?.motions)
      ? (legacyVrm!.motions as import("./customVrmMotions").CustomVrmMotion[])
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
    // Only migrate root chatAi into an existing profile that still lacks the field
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
      kind === "vrm" ? legacyVrm : undefined
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
      modelKind === "vrm" ? legacyVrm : undefined
    );
  }

  return next;
}

function applyActiveProfile(
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
    hitBoundsEnabled: p.hitBoundsEnabled,
    catchphrases: p.catchphrases,
    catchphraseChance: p.catchphraseChance,
    // Always expose Susu's VRM bag on the mirror fields (shared asset)
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
  // Migrate from former per-profile chatEnabled
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
    profiles,
    ...active,
  };
}

function syncActiveProfileIntoProfiles(
  settings: PetSettings
): PetSettings {
  const model = settings.modelKind;
  const prev = settings.profiles[model] ?? defaultProfileForModel(model);
  const vrmExt = normalizeVrmExtension({
    customMotions: settings.customVrmMotions,
    modelName: settings.vrmModelName,
    modelRev: settings.vrmModelRev,
  });

  const activeExtensions =
    model === "vrm"
      ? { ...prev.extensions, vrm: vrmExt }
      : prev.extensions;

  const updatedActive = normalizeOneProfile(model, {
    nickname: settings.nickname,
    personality: settings.personality,
    tone: settings.tone,
    lookId: settings.lookId,
    zoomPercent: settings.zoomPercent,
    demoMotion: settings.demoMotion,
    muted: settings.muted,
    ttsEnabled: settings.ttsEnabled,
    ttsVoiceUri: settings.ttsVoiceUri,
    chatAi: settings.chatAi,
    opacity: settings.opacity,
    usbWatchEnabled: settings.usbWatchEnabled,
    randomIdleEnabled: settings.randomIdleEnabled,
    hitBoundsEnabled: settings.hitBoundsEnabled,
    catchphrases: settings.catchphrases,
    catchphraseChance: settings.catchphraseChance,
    customLines: prev.customLines,
    customLinesOnly: prev.customLinesOnly,
    disabledMotions: prev.disabledMotions,
    disabledBuiltInLines: prev.disabledBuiltInLines,
    extensions: activeExtensions,
  });

  const profiles: PetModelProfiles = {
    ...settings.profiles,
    [model]: updatedActive,
  };

  if (model !== "vrm") {
    profiles.vrm = normalizeOneProfile("vrm", {
      ...settings.profiles.vrm,
      extensions: {
        ...settings.profiles.vrm?.extensions,
        vrm: vrmExt,
      },
    });
  }

  return normalizePetSettings({ ...settings, profiles });
}

export function switchPetModel(
  settings: PetSettings,
  nextModel: PetModelKind,
  fromModel?: PetModelKind
): PetSettings {
  const prev = fromModel ?? settings.modelKind;
  const withPrev: PetSettings = { ...settings, modelKind: prev };
  const saved = syncActiveProfileIntoProfiles(withPrev);
  if (prev === nextModel) return saved;
  const profiles = saved.profiles;
  const active = applyActiveProfile(nextModel, profiles);
  return normalizePetSettings({
    ...saved,
    modelKind: nextModel,
    profiles,
    ...active,
  });
}

export function resetActiveModelProfile(settings: PetSettings): PetSettings {
  const model = settings.modelKind;
  const profiles: PetModelProfiles = {
    ...settings.profiles,
    [model]: defaultProfileForModel(model),
  };
  // Keep shared VRM file when resetting non-vrm character
  if (model !== "vrm" && settings.profiles.vrm) {
    profiles.vrm = settings.profiles.vrm;
  }
  return normalizePetSettings({
    ...settings,
    profiles,
    ...applyActiveProfile(model, profiles),
  });
}

export function patchActiveProfile(
  settings: PetSettings,
  patch: Partial<
    Pick<
      PetModelProfile,
      | "customLines"
      | "customLinesOnly"
      | "disabledMotions"
      | "disabledBuiltInLines"
      | "extensions"
    >
  >
): PetSettings {
  const model = settings.modelKind;
  const synced = syncActiveProfileIntoProfiles(settings);
  const prev = synced.profiles[model] ?? defaultProfileForModel(model);
  const profiles: PetModelProfiles = {
    ...synced.profiles,
    [model]: normalizeOneProfile(model, { ...prev, ...patch }),
  };
  return normalizePetSettings({ ...synced, profiles });
}

export function loadPetSettings(): PetSettings {
  try {
    const raw = readSettingsRaw();
    if (!raw)
      return { ...DEFAULT_PET_SETTINGS, profiles: createDefaultProfiles() };
    return normalizePetSettings(JSON.parse(raw) as Partial<PetSettings>);
  } catch {
    return { ...DEFAULT_PET_SETTINGS, profiles: createDefaultProfiles() };
  }
}

function savePetSettings(settings: PetSettings): PetSettings {
  const next = syncActiveProfileIntoProfiles(settings);
  writeSettingsRaw(JSON.stringify(next));
  return next;
}

export async function publishPetSettings(
  settings: PetSettings
): Promise<PetSettings> {
  const next = savePetSettings(settings);
  await emitPetSettings(next);
  return next;
}

async function emitPetSettings(next: PetSettings): Promise<void> {
  try {
    const { emit } = await import("@tauri-apps/api/event");
    await emit(PET_SETTINGS_EVENT, next);
  } catch {
    // ignore
  }
  try {
    const { notifyPetStoreFromSave } = await import("./store");
    notifyPetStoreFromSave(next);
  } catch {
    // ignore
  }
}

export async function patchPetSettings(
  patch: Partial<PetSettings>
): Promise<PetSettings> {
  const current = loadPetSettings();
  const keys = Object.keys(patch);
  const globalOnly =
    keys.length > 0 &&
    keys.every((k) =>
      ["settingsAlwaysOnTop", "enabled", "uiTheme", "sysStatsDefaultExpanded", "chatEnabled"].includes(
        k
      )
    );
  if (globalOnly) {
    const next = normalizePetSettings({ ...current, ...patch });
    writeSettingsRaw(JSON.stringify(next));
    await emitPetSettings(next);
    return next;
  }
  return publishPetSettings({
    ...current,
    ...patch,
  });
}
