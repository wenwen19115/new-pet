import type {
  PetModelProfile,
  PetModelProfiles,
  PetSettings,
} from "../types";
import { defaultProfileForModel } from "./defaults";
import type { PetModelKind } from "../../skins";
import { characterSupportsVrmAssets } from "../../characters";
import { normalizeVrmExtension } from "../extensions";
import {
  applyActiveProfile,
  normalizeOneProfile,
  normalizePetSettings,
} from "./normalize";

export function syncActiveProfileIntoProfiles(
  settings: PetSettings
): PetSettings {
  const model = settings.modelKind;
  const prev = settings.profiles[model] ?? defaultProfileForModel(model);
  const vrmExt = normalizeVrmExtension({
    customMotions: settings.customVrmMotions,
    modelName: settings.vrmModelName,
    modelRev: settings.vrmModelRev,
  });

  const activeExtensions = characterSupportsVrmAssets(model)
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
    playfulModeEnabled: settings.playfulModeEnabled,
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

  if (!characterSupportsVrmAssets(model)) {
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
  if (!characterSupportsVrmAssets(model) && settings.profiles.vrm) {
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
